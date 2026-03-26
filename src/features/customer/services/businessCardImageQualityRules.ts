export type BusinessCardImageQualityFlag = {
  reasonKey:
    | "customer.ocrImageQualityLowResolution"
    | "customer.ocrImageQualityLowFileSize"
    | "customer.ocrImageQualityAspectRatio"
    | "customer.ocrImageQualityNoScanner";
  severity: "low" | "medium" | "high";
};

export type BusinessCardImageQualityAssessment = {
  score: number;
  shouldWarn: boolean;
  width: number | null;
  height: number | null;
  fileSizeBytes: number | null;
  flags: BusinessCardImageQualityFlag[];
};

export type BusinessCardImageQualityInputs = {
  width: number | null;
  height: number | null;
  fileSizeBytes: number | null;
  usedScanner?: boolean;
};

function pushFlag(
  flags: BusinessCardImageQualityFlag[],
  reasonKey: BusinessCardImageQualityFlag["reasonKey"],
  severity: BusinessCardImageQualityFlag["severity"],
  penalty: number,
  currentScore: number
): number {
  flags.push({ reasonKey, severity });
  return currentScore - penalty;
}

export function buildBusinessCardImageQualityAssessment(
  inputs: BusinessCardImageQualityInputs
): BusinessCardImageQualityAssessment {
  const flags: BusinessCardImageQualityFlag[] = [];
  let score = 100;
  const { width, height, fileSizeBytes } = inputs;

  const shortSide = width && height ? Math.min(width, height) : null;
  const longSide = width && height ? Math.max(width, height) : null;
  const aspectRatio = shortSide && longSide ? longSide / Math.max(shortSide, 1) : null;

  if (shortSide !== null && shortSide < 700) {
    score = pushFlag(flags, "customer.ocrImageQualityLowResolution", "high", 24, score);
  } else if (shortSide !== null && shortSide < 950) {
    score = pushFlag(flags, "customer.ocrImageQualityLowResolution", "medium", 14, score);
  }

  if (aspectRatio !== null && (aspectRatio < 1.2 || aspectRatio > 2.6)) {
    score = pushFlag(flags, "customer.ocrImageQualityAspectRatio", "medium", 14, score);
  }

  if (fileSizeBytes !== null && fileSizeBytes < 110 * 1024) {
    score = pushFlag(flags, "customer.ocrImageQualityLowFileSize", "medium", 12, score);
  }

  if (!inputs.usedScanner) {
    score = pushFlag(flags, "customer.ocrImageQualityNoScanner", "low", 6, score);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    shouldWarn: score < 72 || flags.some((flag) => flag.severity === "high"),
    width,
    height,
    fileSizeBytes,
    flags,
  };
}
