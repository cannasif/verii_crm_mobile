import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "business_card_scan_telemetry";
const MAX_EVENTS = 100;
const FLUSH_DELAY_MS = 1500;

export type BusinessCardTelemetryEvent = {
  type:
    | "scan_started"
    | "scan_completed"
    | "scan_failed"
    | "scanner_used"
    | "camera_fallback_used"
    | "gallery_used"
    | "qr_detected"
    | "qr_processed"
    | "qr_cancelled"
    | "llm_fallback_used"
    | "image_quality_warned"
    | "image_quality_retry_selected"
    | "review_confirmed"
    | "review_retry";
  timestamp: string;
  details?: Record<string, string | number | boolean | null | undefined>;
};

let memoryQueue: BusinessCardTelemetryEvent[] = [];
let persistedQueue: BusinessCardTelemetryEvent[] | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushPromise: Promise<void> | null = null;
const isDevRuntime = typeof __DEV__ !== "undefined" && __DEV__;

function appendBoundedEvents(base: BusinessCardTelemetryEvent[], next: BusinessCardTelemetryEvent[]): BusinessCardTelemetryEvent[] {
  return [...base, ...next].slice(-MAX_EVENTS);
}

async function loadPersistedQueue(): Promise<BusinessCardTelemetryEvent[]> {
  if (persistedQueue) return persistedQueue;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    persistedQueue = raw ? (JSON.parse(raw) as BusinessCardTelemetryEvent[]) : [];
  } catch {
    persistedQueue = [];
  }
  return persistedQueue;
}

async function flushTelemetryQueue(): Promise<void> {
  flushTimer = null;
  if (!memoryQueue.length) return;

  const pending = [...memoryQueue];
  memoryQueue = [];

  try {
    const current = await loadPersistedQueue();
    persistedQueue = appendBoundedEvents(current, pending);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persistedQueue));
  } catch {
    memoryQueue = appendBoundedEvents(pending, memoryQueue);
    if (isDevRuntime) {
      console.log("[BusinessCardTelemetry] Persist failed", pending.map((item) => item.type).join(","));
    }
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushPromise = flushTelemetryQueue().finally(() => {
      flushPromise = null;
    });
  }, FLUSH_DELAY_MS);
}

export async function trackBusinessCardTelemetry(event: Omit<BusinessCardTelemetryEvent, "timestamp">): Promise<void> {
  const withTimestamp: BusinessCardTelemetryEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  memoryQueue = appendBoundedEvents(memoryQueue, [withTimestamp]);
  scheduleFlush();

  if (isDevRuntime) {
    console.log("[BusinessCardTelemetry]", withTimestamp.type, withTimestamp.details ?? {});
  }
}

export async function getBusinessCardTelemetryEvents(): Promise<BusinessCardTelemetryEvent[]> {
  if (flushPromise) {
    await flushPromise;
  } else if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
    await flushTelemetryQueue();
  }

  try {
    const current = await loadPersistedQueue();
    return appendBoundedEvents(current, memoryQueue);
  } catch {
    return memoryQueue;
  }
}
