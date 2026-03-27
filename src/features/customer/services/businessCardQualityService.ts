import type { BusinessCardReviewFlag, BusinessCardReviewSummary } from "../types/businessCard";
import type { OcrLineItem } from "./ocrService";

export type BusinessCardQualityAssessment = {
  confidencePenalty: number;
  flags: BusinessCardReviewFlag[];
};

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function getLineTiltDegrees(line: OcrLineItem): number | null {
  const points = line.cornerPoints;
  if (!points || points.length < 2) return null;
  const first = points[0];
  const second = points[1];
  if (!first || !second) return null;
  const dx = second.x - first.x;
  const dy = second.y - first.y;
  if (dx === 0) return 90;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

function averageAbsoluteTilt(lines: OcrLineItem[]): number | null {
  const tilts = lines
    .map((line) => getLineTiltDegrees(line))
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    .map((value) => Math.abs(value));
  if (!tilts.length) return null;
  return tilts.reduce((sum, value) => sum + value, 0) / tilts.length;
}

export function assessBusinessCardOcrQuality(
  rawText: string,
  lines: string[],
  lineItems: OcrLineItem[]
): BusinessCardQualityAssessment {
  const flags: BusinessCardReviewFlag[] = [];
  let confidencePenalty = 0;

  const normalizedText = rawText.replace(/\s+/g, " ").trim();
  const uniqueLines = unique(lines);
  const duplicateRatio = lines.length > 0 ? 1 - uniqueLines.length / lines.length : 0;
  const letterCount = (normalizedText.match(/\p{L}/gu) ?? []).length;
  const textLength = normalizedText.length;
  const avgLineLength = uniqueLines.length > 0
    ? uniqueLines.reduce((sum, line) => sum + line.length, 0) / uniqueLines.length
    : 0;
  const hasContactSignal = /@|www\.|https?:\/\/|\+\d|\b(?:tel|telefon|gsm|mobile|fax|faks|email|e-mail)\b/i.test(normalizedText);
  const avgTilt = averageAbsoluteTilt(lineItems);
  const totalElements = lineItems.reduce((sum, item) => sum + (item.elementsCount ?? 0), 0);
  const avgElementsPerLine = lineItems.length > 0 ? totalElements / lineItems.length : 0;
  const recognizedLanguageCount = new Set(lineItems.flatMap((item) => item.recognizedLanguages ?? [])).size;

  const pushFlag = (reason: string, severity: BusinessCardReviewFlag["severity"], penalty: number): void => {
    flags.push({ field: "general", reason, severity });
    confidencePenalty += penalty;
  };

  if (textLength < 35 || uniqueLines.length < 3) {
    pushFlag("OCR metni çok kısa görünüyor. Kartın tamamı okunmamış olabilir.", "high", 22);
  }

  if (lineItems.length <= 2) {
    pushFlag("Okunan satır sayısı düşük. Kırpma veya netlik sorunu olabilir.", "high", 18);
  }

  if (duplicateRatio >= 0.3) {
    pushFlag("Bazı satırlar tekrar ediyor. OCR görüntüyü kararsız okumuş olabilir.", "medium", 10);
  }

  if (avgLineLength > 70) {
    pushFlag("Satırlar çok uzun birleşmiş görünüyor. Adres ve iletişim bilgileri karışmış olabilir.", "medium", 8);
  }

  if (letterCount > 0 && letterCount / Math.max(textLength, 1) < 0.45) {
    pushFlag("Metinde harf oranı düşük. Gürültü veya yanlış bölge okunmuş olabilir.", "medium", 8);
  }

  if (!hasContactSignal) {
    pushFlag("İletişim sinyalleri zayıf görünüyor. Kartvizit yerine başka bir içerik okunmuş olabilir.", "medium", 10);
  }

  if (avgTilt !== null && avgTilt >= 8) {
    pushFlag("OCR satırları belirgin eğik görünüyor. Kart açılı veya döndürülmüş okunmuş olabilir.", avgTilt >= 14 ? "high" : "medium", avgTilt >= 14 ? 18 : 10);
  }

  if (lineItems.length >= 3 && avgElementsPerLine > 0 && avgElementsPerLine < 1.4) {
    pushFlag("Satır içi kelime bölünmesi zayıf görünüyor. OCR kelimeleri sağlıklı ayıramamış olabilir.", "medium", 8);
  }

  if (letterCount > 20 && recognizedLanguageCount === 0) {
    pushFlag("OCR dil sinyali üretmedi. Karakter ayrımı beklenenden daha zayıf olabilir.", "low", 6);
  }

  return {
    confidencePenalty,
    flags,
  };
}

export function mergeReviewWithQualityAssessment(
  review: BusinessCardReviewSummary | undefined,
  quality: BusinessCardQualityAssessment
): BusinessCardReviewSummary | undefined {
  if (!review && quality.flags.length === 0) return review;

  const mergedFlags = [
    ...(review?.flags ?? []),
    ...quality.flags.filter(
      (flag) => !(review?.flags ?? []).some((existing) => existing.field === flag.field && existing.reason === flag.reason)
    ),
  ];

  const overallConfidence = Math.max(0, Math.min(100, Math.round((review?.overallConfidence ?? 70) - quality.confidencePenalty)));

  return {
    overallConfidence,
    fieldConfidence: review?.fieldConfidence ?? {},
    flags: mergedFlags,
  };
}
