import { getBusinessCardTelemetryEvents, trackBusinessCardTelemetry } from "./businessCardTelemetryService";

(async () => {
  await trackBusinessCardTelemetry({ type: "scan_started", details: { source: "camera" } });
  await trackBusinessCardTelemetry({ type: "scan_completed", details: { source: "camera", reviewConfidence: 88 } });
  const events = await getBusinessCardTelemetryEvents();
  if (events.length < 2) {
    throw new Error("telemetry events should be stored");
  }
  console.log("businessCardTelemetryService test passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
