import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "business_card_scan_telemetry";
const MAX_EVENTS = 100;

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

export async function trackBusinessCardTelemetry(event: Omit<BusinessCardTelemetryEvent, "timestamp">): Promise<void> {
  const withTimestamp: BusinessCardTelemetryEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  memoryQueue = [...memoryQueue, withTimestamp].slice(-MAX_EVENTS);

  try {
    const currentRaw = await AsyncStorage.getItem(STORAGE_KEY);
    const current = currentRaw ? (JSON.parse(currentRaw) as BusinessCardTelemetryEvent[]) : [];
    const next = [...current, withTimestamp].slice(-MAX_EVENTS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    if (__DEV__) {
      console.log("[BusinessCardTelemetry] Persist failed", withTimestamp.type);
    }
  }

  if (__DEV__) {
    console.log("[BusinessCardTelemetry]", withTimestamp.type, withTimestamp.details ?? {});
  }
}

export async function getBusinessCardTelemetryEvents(): Promise<BusinessCardTelemetryEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return memoryQueue;
    return JSON.parse(raw) as BusinessCardTelemetryEvent[];
  } catch {
    return memoryQueue;
  }
}
