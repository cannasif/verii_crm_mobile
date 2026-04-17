import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_TIMEOUT, getApiBaseUrl, initializeApiBaseUrl } from "../constants/config";
import type { ApiResponse, Branch } from "../features/auth/types";
import { useAuthStore } from "../store/auth";
import { router } from "expo-router";
import i18n, { getCurrentLanguage } from "../locales";

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

function isIsoDateTimeWithoutOffset(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value);
}

function convertLocalDateTimeStringToUtc(value: string): string {
  if (!isIsoDateTimeWithoutOffset(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toISOString();
}

function normalizeUtcDateStrings<T>(payload: T): T {
  if (
    payload instanceof ArrayBuffer ||
    ArrayBuffer.isView(payload) ||
    (typeof Blob !== "undefined" && payload instanceof Blob)
  ) {
    return payload;
  }

  if (payload == null || typeof payload !== "object" || payload instanceof Date) {
    if (typeof payload === "string" && isIsoDateTimeWithoutOffset(payload)) {
      return `${payload}Z` as T;
    }
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeUtcDateStrings(item)) as T;
  }

  const source = payload as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};
  Object.entries(source).forEach(([key, value]) => {
    normalized[key] = normalizeUtcDateStrings(value);
  });
  return normalized as T;
}

function normalizeOutgoingUtcDateStrings<T>(payload: T): T {
  if (payload == null || typeof payload !== "object" || payload instanceof Date) {
    if (typeof payload === "string") {
      return convertLocalDateTimeStringToUtc(payload) as T;
    }
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeOutgoingUtcDateStrings(item)) as T;
  }

  const source = payload as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};
  Object.entries(source).forEach(([key, value]) => {
    normalized[key] = normalizeOutgoingUtcDateStrings(value);
  });
  return normalized as T;
}

export async function initializeApiClient(): Promise<void> {
  const baseUrl = await initializeApiBaseUrl();
  apiClient.defaults.baseURL = baseUrl;
}

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    config.baseURL = getApiBaseUrl();
    const authState = useAuthStore.getState();
    if (!authState.isHydrated && !config.url?.includes("/api/auth/login")) {
      await authState.hydrate();
    }

    const token = useAuthStore.getState().token;
    const branch = useAuthStore.getState().branch as Branch | null;
    const language = getCurrentLanguage();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data !== undefined && !(config.data instanceof FormData)) {
      config.data = normalizeOutgoingUtcDateStrings(config.data);
    }

    config.headers["X-Language"] = language || "tr";

    const branchCode = branch?.code;
    if (branchCode !== undefined && branchCode !== null && String(branchCode).trim() !== "") {
      const normalizedBranchCode = String(branchCode);
      config.headers["X-Branch-Code"] = normalizedBranchCode;
      config.headers.BranchCode = normalizedBranchCode;
    }

    if (__DEV__) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data,
      });
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    response.data = normalizeUtcDateStrings(response.data);
    if (__DEV__) {
      const payload = response.data as { data?: unknown; success?: boolean } | undefined;
      const pageData = payload?.data as { items?: unknown[]; Items?: unknown[]; totalCount?: number; TotalCount?: number } | undefined;
      const itemsCount = Array.isArray(pageData?.items)
        ? pageData?.items.length
        : Array.isArray(pageData?.Items)
          ? pageData?.Items.length
          : undefined;

      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        success: payload?.success,
        itemsCount,
        totalCount: pageData?.totalCount ?? pageData?.TotalCount,
      });
    }
    return response;
  },
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const requestUrl = error.config?.url || "";

    if (error.response?.status === 401 && !requestUrl.includes("/api/auth/login")) {
      await useAuthStore.getState().clearAuth();
      router.replace("/(auth)/login");
    }

    let errorMessage = i18n.t("common.error");

    if (error.response?.data) {
      const responseData = error.response.data as any;
      if (responseData.message) {
        errorMessage = responseData.message;
      } else if (responseData.exceptionMessage) {
        errorMessage = responseData.exceptionMessage;
      } else if (responseData.errors && responseData.errors.length > 0) {
        errorMessage = responseData.errors.join(", ");
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    const enhancedError = new Error(errorMessage) as Error & {
      response: typeof error.response;
      status: number | undefined;
    };
    enhancedError.response = error.response;
    enhancedError.status = error.response?.status;

    return Promise.reject(enhancedError);
  }
);
