import * as signalR from "@microsoft/signalr";
import { authAccessApi } from "../features/access-control/api/authAccessApi";
import { getSystemSettings } from "../features/system-settings/api/systemSettingsApi";
import { getApiBaseUrl } from "../constants/config";
import { queryClient } from "./queryClient";
import { applySystemLanguageIfNeeded } from "./systemSettings";
import { useAuthStore } from "../store/auth";
import { useSystemSettingsStore } from "../store/system-settings";
import { useToastStore } from "../store/toast";

interface AccessControlChangedPayload {
  reason?: string;
  forceBootstrapRefresh?: boolean;
  issuedAt?: string;
}

interface RealtimeNotificationPayload {
  id: number;
  title?: string;
  message?: string;
  userId?: number;
  isRead?: boolean;
}

const ACCESS_CONTROL_QUERY_ROOTS = new Set(["activity", "demand", "quotation", "order", "customer360"]);

class RealtimeAccessControlService {
  private hubConnection: signalR.HubConnection | null = null;
  private refreshPromise: Promise<void> | null = null;
  private connectPromise: Promise<void> | null = null;
  private connectionToken: string | null = null;
  private manualDisconnect = false;

  private buildHubConnection(): signalR.HubConnection {
    const hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${getApiBaseUrl()}/notificationHub`, {
        accessTokenFactory: () => useAuthStore.getState().token ?? "",
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.elapsedMilliseconds >= 60_000) {
            return null;
          }

          const retry = retryContext.previousRetryCount;
          if (retry === 0) return 0;
          if (retry === 1) return 2_000;
          if (retry === 2) return 10_000;
          return Math.min(30_000, 5_000 * (retry + 1));
        },
      })
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    hubConnection.serverTimeoutInMilliseconds = 60_000;
    hubConnection.keepAliveIntervalInMilliseconds = 15_000;

    hubConnection.on("AccessControlChanged", (payload: AccessControlChangedPayload) => {
      void this.handleAccessControlChanged(payload);
    });

    hubConnection.on("ReceiveNotification", (payload: RealtimeNotificationPayload) => {
      this.handleNotification(payload);
    });

    hubConnection.onreconnected(() => {
      void this.handleAccessControlChanged({
        forceBootstrapRefresh: true,
        reason: "signalr-reconnected",
      });
    });

    hubConnection.onclose(() => {
      this.hubConnection = null;
      this.connectPromise = null;

      if (!this.manualDisconnect && useAuthStore.getState().token) {
        globalThis.setTimeout(() => {
          void this.connect(useAuthStore.getState().token ?? "").catch(() => undefined);
        }, 5_000);
      }
    });

    return hubConnection;
  }

  private async startConnectionWithRetry(connection: signalR.HubConnection): Promise<boolean> {
    let attempt = 0;

    while (!this.manualDisconnect) {
      try {
        await connection.start();
        return true;
      } catch {
        attempt += 1;
        const delayMs = Math.min(30_000, 1_000 * 2 ** Math.min(attempt, 5));
        await new Promise((resolve) => globalThis.setTimeout(resolve, delayMs));
      }
    }

    return false;
  }

  async connect(token: string): Promise<void> {
    if (!token) {
      return;
    }

    if (this.hubConnection && this.connectionToken !== token) {
      await this.disconnect();
    }

    if (
      this.hubConnection?.state === signalR.HubConnectionState.Connected ||
      this.hubConnection?.state === signalR.HubConnectionState.Connecting ||
      this.hubConnection?.state === signalR.HubConnectionState.Reconnecting
    ) {
      return this.connectPromise ?? Promise.resolve();
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.manualDisconnect = false;

    this.connectPromise = (async () => {
      const hubConnection = this.buildHubConnection();
      this.hubConnection = hubConnection;
      this.connectionToken = token;
      const started = await this.startConnectionWithRetry(hubConnection);
      if (!started) {
        this.hubConnection = null;
        this.connectionToken = null;
      }
    })().finally(() => {
      this.connectPromise = null;
    });

    return this.connectPromise;
  }

  async disconnect(): Promise<void> {
    this.manualDisconnect = true;

    const connection = this.hubConnection;
    this.hubConnection = null;
    this.connectionToken = null;

    if (connection) {
      await connection.stop();
    }
  }

  private async refreshAccessControlState(forceBootstrapRefresh: boolean): Promise<void> {
    const { token, user, setPermissions } = useAuthStore.getState();
    if (!token || !user?.id) {
      return;
    }

    const [permissions, settings] = await Promise.all([
      authAccessApi.getMyPermissions(),
      getSystemSettings(),
    ]);

    await setPermissions(permissions);
    useSystemSettingsStore.getState().setSettings(settings);
    await applySystemLanguageIfNeeded();

    await queryClient.invalidateQueries({
      predicate: (query) => {
        const [root] = query.queryKey;
        return typeof root === "string" && ACCESS_CONTROL_QUERY_ROOTS.has(root);
      },
      refetchType: "active",
    });

    if (forceBootstrapRefresh) {
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const [root] = query.queryKey;
          return typeof root === "string" && root === "user";
        },
        refetchType: "active",
      });
    }
  }

  private handleNotification(payload: RealtimeNotificationPayload): void {
    const currentUserId = useAuthStore.getState().user?.id ?? null;
    if (!currentUserId || payload.userId !== currentUserId || payload.isRead) {
      return;
    }

    const title = payload.title?.trim() || "Yeni bildirim";
    const message = payload.message?.trim() || "Sizin icin yeni bir bildirim var.";
    useToastStore.getState().showToast("info", `${title}: ${message}`);
  }

  private async handleAccessControlChanged(payload: AccessControlChangedPayload): Promise<void> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.refreshAccessControlState(payload.forceBootstrapRefresh ?? true).finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }
}

export const realtimeAccessControlService = new RealtimeAccessControlService();
