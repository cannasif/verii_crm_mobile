import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { runOCR } from "../services/ocrService";
import { preprocessBusinessCardOcr } from "../services/businessCardOcrPreprocessService";
import { buildBusinessCardOcrVariants } from "../services/businessCardSecondPassService";
import { extractBusinessCardViaLLM } from "../services/businessCardLlmService";
import { buildBusinessCardCandidateHints } from "../services/businessCardHeuristics";
import { captureBusinessCardFromCamera, pickBusinessCardImageFromGallery } from "../services/businessCardCaptureService";
import { createBusinessCardPreviewImage } from "../services/businessCardNativeImageProcessor";
import { assessBusinessCardOcrQuality, mergeReviewWithQualityAssessment } from "../services/businessCardQualityService";
import { trackBusinessCardTelemetry } from "../services/businessCardTelemetryService";
import { detectBusinessCardLanguageProfile } from "../services/businessCardLanguageProfileService";
import {
  mergeBusinessCardExtractions,
  pickBestBusinessCardExtraction,
  repairJsonString,
  toBusinessCardOcrResult,
  validateAndNormalizeBusinessCardExtraction,
} from "../schemas/businessCardSchema";
import { parseBusinessCardText } from "../utils/parseBusinessCardText";
import type { BusinessCardOcrResult } from "../types/businessCard";
import type { OcrResultPayload } from "../services/ocrService";

function fallbackToStructuredInput(parsed: BusinessCardOcrResult): {
  contactNameAndSurname: string | null;
  name: string | null;
  title: string | null;
  company: string | null;
  phones: string[];
  emails: string[];
  website: string | null;
  address: string | null;
  social: { linkedin: null; instagram: null; x: null; facebook: null };
  notes: string[];
} {
  return {
    contactNameAndSurname: parsed.contactNameAndSurname ?? null,
    name: parsed.contactNameAndSurname ?? null,
    title: parsed.title ?? null,
    company: parsed.customerName ?? null,
    phones: [parsed.phone1, parsed.phone2].filter(Boolean) as string[],
    emails: parsed.email ? [parsed.email] : [],
    website: parsed.website ?? null,
    address: parsed.address ?? null,
    social: {
      linkedin: null,
      instagram: null,
      x: null,
      facebook: null,
    },
    notes: parsed.notes ? [parsed.notes] : [],
  };
}

type ScanLane = "fast" | "advanced";
type ScanStageTimings = {
  lane: ScanLane;
  acquire_time?: number;
  image_handling_time: number;
  preview_generate_time: number;
  ocr_time: number;
  parse_time: number;
  normalize_time: number;
  llm_time: number;
  second_pass_time: number;
  total_time: number;
  llm_called: boolean;
};
type CachedOcrEntry = {
  raw: OcrResultPayload;
  preprocessed?: OcrResultPayload;
};

function buildPreferredRawText(ocr: OcrResultPayload): string {
  const lineText = ocr.lines.join("\n").trim();
  const rawText = (ocr.rawText || "").trim();
  if (!rawText) return lineText;
  if (ocr.lines.length >= 3 && rawText.split(/\r?\n/).length <= 1) {
    return lineText || rawText;
  }
  return rawText.length >= lineText.length ? rawText : lineText || rawText;
}

function buildFastLaneOcrWindow(ocr: OcrResultPayload): {
  rawText: string;
  lines: string[];
} {
  const limitedLines = ocr.lines
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 28);

  const truncatedLines = limitedLines.map((line) => (line.length > 96 ? line.slice(0, 96).trim() : line));
  const joined = truncatedLines.join("\n").trim();
  const rawText = joined.length > 0 ? joined : buildPreferredRawText(ocr).slice(0, 1400).trim();

  return {
    rawText: rawText.length > 1400 ? rawText.slice(0, 1400).trim() : rawText,
    lines: truncatedLines,
  };
}

function isLikelyBusinessCardSignal(rawText: string, lines: string[]): boolean {
  const normalized = rawText.replace(/\s+/g, " ").trim();
  const contactSignals = (normalized.match(/@|www\.|https?:\/\/|\+\d|\b(?:tel|telefon|gsm|mobile|fax|email|e-mail|web)\b/gi) ?? []).length;
  const uppercaseShortLines = lines.filter((line) => /^[\p{L}\s&.-]{2,40}$/u.test(line) && line === line.toUpperCase()).length;
  const personLikeLines = lines.filter((line) => {
    const tokens = line.replace(/[^\p{L}\s'.-]/gu, " ").split(/\s+/).filter(Boolean);
    return tokens.length >= 2 && tokens.length <= 4;
  }).length;
  const uiNoiseHits = (normalized.match(/\b(?:giriş yap|şube seçin|beni hatırla|şifremi unuttum|login|sign in|password)\b/gi) ?? []).length;

  if (uiNoiseHits >= 2 && contactSignals === 0) return false;
  return contactSignals >= 1 || uppercaseShortLines >= 1 || personLikeLines >= 1;
}

function applyQualityReview(
  result: BusinessCardOcrResult,
  rawText: string,
  lines: string[],
  lineItems: import("../services/ocrService").OcrLineItem[]
): BusinessCardOcrResult {
  const quality = assessBusinessCardOcrQuality(rawText, lines, lineItems);
  return {
    ...result,
    review: mergeReviewWithQualityAssessment(result.review, quality),
  };
}

function rescueNameFromTitleNeighbor(result: BusinessCardOcrResult, orderedLines: string[]): BusinessCardOcrResult {
  if (result.contactNameAndSurname?.trim() || !result.title?.trim()) return result;

  const normalizedTitle = result.title.trim().toLocaleLowerCase("tr-TR");
  const titleIndex = orderedLines.findIndex((line) => {
    const normalizedLine = line.trim().toLocaleLowerCase("tr-TR");
    return normalizedLine === normalizedTitle || normalizedLine.includes(normalizedTitle) || normalizedTitle.includes(normalizedLine);
  });

  if (titleIndex <= 0) return result;

  const isNoise = (value: string): boolean =>
    /@|www\.|https?:\/\/|\+?\d{6,}|\b(?:mah|mh|cad|cd|sok|sk|no|kat|fax|gsm|tel|telefon|email|e-?posta|web|website)\b/i.test(
      value
    );
  const isCompanyish = (value: string): boolean =>
    /\b(?:ltd|a\.ş|aş|san|tic|gmbh|llc|inc|corp|makine|machine|otomasyon|automation|systems|sistemleri|holding|group|grup)\b/i.test(
      value
    ) || value === value.toUpperCase();
  const isSimpleName = (value: string): boolean => {
    const tokens = value.replace(/[^\p{L}\s'.-]/gu, " ").split(/\s+/).filter(Boolean);
    if (tokens.length < 2 || tokens.length > 4) return false;
    return tokens.every((token) => /^[\p{L}.'-]+$/u.test(token));
  };

  const prev = orderedLines[titleIndex - 1]?.trim() ?? "";
  if (prev && !isNoise(prev) && !isCompanyish(prev) && isSimpleName(prev)) {
    return { ...result, contactNameAndSurname: prev };
  }

  const prev2 = orderedLines[titleIndex - 2]?.trim() ?? "";
  if (
    prev2 &&
    prev &&
    !isNoise(prev2) &&
    !isNoise(prev) &&
    !isCompanyish(prev2) &&
    !isCompanyish(prev)
  ) {
    const merged = `${prev2} ${prev}`.replace(/\s+/g, " ").trim();
    if (isSimpleName(merged)) {
      return { ...result, contactNameAndSurname: merged };
    }
  }

  return result;
}

function withLanguageProfile(
  result: BusinessCardOcrResult,
  rawText: string,
  recognizedLanguages: string[]
): BusinessCardOcrResult {
  const detected = detectBusinessCardLanguageProfile(rawText);
  return {
    ...result,
    languageProfile: {
      ...detected,
      recognizedLanguages,
    },
  };
}

function shouldRunBusinessCardSecondPass(result: BusinessCardOcrResult | null | undefined): boolean {
  const review = result?.review;
  if (!review) return false;
  if ((review.overallConfidence ?? 100) < 72) return true;
  return review.flags.some((flag) => flag.severity === "high");
}

function shouldUseDeterministicFastPath(result: BusinessCardOcrResult | null | undefined): boolean {
  const review = result?.review;
  if (!result || !review) return false;

  const hasCompany = Boolean(result.customerName?.trim());
  const hasContactName = Boolean(result.contactNameAndSurname?.trim());
  const hasPrimaryPhone = Boolean(result.phone1);
  const hasSecondaryContactSignal = Boolean(result.email || result.website || result.address);
  const hasCriticalHighFlag = review.flags.some(
    (flag) =>
      flag.severity === "high" &&
      (flag.field === "customerName" || flag.field === "contactNameAndSurname" || flag.field === "email" || flag.field === "phone1")
  );
  const customerConfidence = review.fieldConfidence.customerName ?? 0;
  const contactConfidence = review.fieldConfidence.contactNameAndSurname ?? 0;
  const phoneConfidence = review.fieldConfidence.phone1 ?? 0;
  const emailConfidence = review.fieldConfidence.email ?? 0;
  const websiteConfidence = review.fieldConfidence.website ?? 0;
  const addressConfidence = review.fieldConfidence.address ?? 0;

  return Boolean(
    hasCompany &&
      hasContactName &&
      hasPrimaryPhone &&
      hasSecondaryContactSignal &&
      customerConfidence >= 68 &&
      contactConfidence >= 70 &&
      phoneConfidence >= 82 &&
      Math.max(emailConfidence, websiteConfidence, addressConfidence) >= 48 &&
      !hasCriticalHighFlag
  );
}

function shouldUseBalancedFastPath(result: BusinessCardOcrResult | null | undefined): boolean {
  const review = result?.review;
  if (!result || !review) return false;

  const dominantScript = result.languageProfile?.dominantScript;
  const isLatinLike = dominantScript === "latin" || dominantScript === "unknown";
  if (!isLatinLike) return false;

  const hasCompany = Boolean(result.customerName?.trim());
  const hasContactName = Boolean(result.contactNameAndSurname?.trim());
  const hasPrimaryPhone = Boolean(result.phone1);
  const supportingSignals = [result.email, result.website, result.address, result.title, result.phone2].filter(Boolean).length;
  const customerConfidence = review.fieldConfidence.customerName ?? 0;
  const contactConfidence = review.fieldConfidence.contactNameAndSurname ?? 0;
  const phoneConfidence = review.fieldConfidence.phone1 ?? 0;
  const overallConfidence = review.overallConfidence ?? 0;
  const hasBlockingCriticalFlag = review.flags.some(
    (flag) =>
      flag.severity === "high" &&
      (flag.field === "customerName" ||
        flag.field === "contactNameAndSurname" ||
        flag.field === "phone1" ||
        flag.field === "general")
  );

  return Boolean(
    hasCompany &&
      hasContactName &&
      hasPrimaryPhone &&
      supportingSignals >= 2 &&
      customerConfidence >= 60 &&
      contactConfidence >= 62 &&
      phoneConfidence >= 80 &&
      overallConfidence >= 72 &&
      !hasBlockingCriticalFlag
  );
}

function shouldUseTurkishFastPath(result: BusinessCardOcrResult | null | undefined): boolean {
  const review = result?.review;
  if (!result || !review) return false;

  const locale = result.languageProfile?.suggestedLocale;
  const dominantScript = result.languageProfile?.dominantScript;
  if (locale !== "tr" || (dominantScript !== "latin" && dominantScript !== "unknown")) return false;

  const hasCompany = Boolean(result.customerName?.trim());
  const hasContactName = Boolean(result.contactNameAndSurname?.trim());
  const hasPrimaryPhone = Boolean(result.phone1);
  const supportingSignals = [result.email, result.website, result.address].filter(Boolean).length;
  const customerConfidence = review.fieldConfidence.customerName ?? 0;
  const contactConfidence = review.fieldConfidence.contactNameAndSurname ?? 0;
  const phoneConfidence = review.fieldConfidence.phone1 ?? 0;
  const overallConfidence = review.overallConfidence ?? 0;
  const hasBlockingCriticalFlag = review.flags.some(
    (flag) =>
      flag.severity === "high" &&
      (flag.field === "customerName" ||
        flag.field === "contactNameAndSurname" ||
        flag.field === "phone1" ||
        flag.field === "general")
  );

  return Boolean(
    hasCompany &&
      hasContactName &&
      hasPrimaryPhone &&
      supportingSignals >= 1 &&
      customerConfidence >= 58 &&
      contactConfidence >= 60 &&
      phoneConfidence >= 80 &&
      overallConfidence >= 68 &&
      !hasBlockingCriticalFlag
  );
}

function isWeakIdentityValue(value: string | null | undefined): boolean {
  const normalized = value?.trim() ?? "";
  if (!normalized) return true;
  if (normalized.length < 4) return true;
  if (/^(group|grup|trade|arma|btso|company|firma)$/i.test(normalized)) return true;
  return false;
}

function shouldRunFastIdentityAssist(result: BusinessCardOcrResult, rawText: string): boolean {
  const review = result.review;
  const supportSignals = [result.phone1, result.email, result.website, result.address].filter(Boolean).length;
  if (supportSignals < 2) return false;
  if (rawText.length < 60) return false;

  const weakCompany = isWeakIdentityValue(result.customerName) || (review?.fieldConfidence.customerName ?? 100) < 58;
  const weakContact =
    isWeakIdentityValue(result.contactNameAndSurname) || (review?.fieldConfidence.contactNameAndSurname ?? 100) < 58;
  const weakTitle = !result.title || (review?.fieldConfidence.title ?? 100) < 45;

  return weakCompany || weakContact || weakTitle;
}

function mergeFastIdentityAssistResult(
  baseResult: BusinessCardOcrResult,
  candidateResult: BusinessCardOcrResult
): BusinessCardOcrResult {
  const merged = { ...baseResult };
  const mergedFieldConfidence = { ...(baseResult.review?.fieldConfidence ?? {}) };
  const mergedFlags = [...(baseResult.review?.flags ?? [])];

  if (candidateResult.customerName && isWeakIdentityValue(baseResult.customerName)) {
    merged.customerName = candidateResult.customerName;
    if (candidateResult.review?.fieldConfidence.customerName != null) {
      mergedFieldConfidence.customerName = candidateResult.review.fieldConfidence.customerName;
    }
  }

  if (candidateResult.contactNameAndSurname && isWeakIdentityValue(baseResult.contactNameAndSurname)) {
    merged.contactNameAndSurname = candidateResult.contactNameAndSurname;
    if (candidateResult.review?.fieldConfidence.contactNameAndSurname != null) {
      mergedFieldConfidence.contactNameAndSurname = candidateResult.review.fieldConfidence.contactNameAndSurname;
    }
  }

  if (candidateResult.title && !baseResult.title) {
    merged.title = candidateResult.title;
    if (candidateResult.review?.fieldConfidence.title != null) {
      mergedFieldConfidence.title = candidateResult.review.fieldConfidence.title;
    }
  }

  if (baseResult.review) {
    merged.review = {
      ...baseResult.review,
      fieldConfidence: mergedFieldConfidence,
      flags: mergedFlags,
      overallConfidence: Math.max(baseResult.review.overallConfidence ?? 0, candidateResult.review?.overallConfidence ?? 0),
    };
  }

  return merged;
}

function mergeFastLayoutHintsResult(
  baseResult: BusinessCardOcrResult,
  candidateHints: ReturnType<typeof buildBusinessCardCandidateHints>
): BusinessCardOcrResult {
  const merged = { ...baseResult };
  const topCompany = candidateHints.layoutProfile.preferredCompanyLines[0] ?? candidateHints.topCandidates.companies[0];
  const topName = candidateHints.layoutProfile.preferredNameLines[0] ?? candidateHints.topCandidates.names[0];
  const topTitle = candidateHints.layoutProfile.preferredTitleLines[0] ?? candidateHints.topCandidates.titles[0];

  if (isWeakIdentityValue(merged.customerName) && topCompany) {
    merged.customerName = topCompany;
  }

  if (isWeakIdentityValue(merged.contactNameAndSurname) && topName) {
    merged.contactNameAndSurname = topName;
  }

  if (!merged.title && topTitle) {
    merged.title = topTitle;
  }

  const emailDomain = merged.email?.split("@")[1]?.trim().toLowerCase() ?? "";
  const websiteDomain = merged.website
    ?.replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    ?.trim()
    .toLowerCase() ?? "";
  if (emailDomain) {
    const weakWebsite =
      !websiteDomain ||
      websiteDomain.length < 8 ||
      /^(?:com|net|org|gov|edu|biz|info|co)\.[a-z]{2,}$/i.test(websiteDomain) ||
      (!websiteDomain.includes(emailDomain) && !emailDomain.includes(websiteDomain));
    if (weakWebsite) {
      merged.website = `www.${emailDomain}`;
    }
  }

  if (
    merged.customerName &&
    merged.contactNameAndSurname &&
    merged.customerName.trim().toLocaleLowerCase("tr-TR") === merged.contactNameAndSurname.trim().toLocaleLowerCase("tr-TR") &&
    topName &&
    topName.trim().toLocaleLowerCase("tr-TR") !== merged.customerName.trim().toLocaleLowerCase("tr-TR")
  ) {
    merged.contactNameAndSurname = topName;
  }

  return merged;
}

export function useBusinessCardScan(): {
  scanBusinessCard: () => Promise<BusinessCardOcrResult | null>;
  pickBusinessCardFromGallery: () => Promise<BusinessCardOcrResult | null>;
  scanBusinessCardFromImageUri: (imageUri: string) => Promise<BusinessCardOcrResult | null>;
  retryBusinessCardExtraction: (imageUri: string) => Promise<BusinessCardOcrResult | null>;
  isScanning: boolean;
  error: string | null;
} {
  const { t } = useTranslation();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ocrCacheRef = useRef(new Map<string, CachedOcrEntry>());
  const previewCacheRef = useRef(new Map<string, string>());

  const debugScanLog = useCallback((stage: string, payload: unknown) => {
    console.log(`[BusinessCardScan] ${stage}`, payload);
  }, []);

  const finalizeResult = useCallback(
    (
      normalized: ReturnType<typeof validateAndNormalizeBusinessCardExtraction>,
      imageUri: string,
      rawText: string,
      ocr: OcrResultPayload
    ): BusinessCardOcrResult =>
      applyQualityReview(
        withLanguageProfile(
          {
            ...toBusinessCardOcrResult(normalized),
            imageUri,
          },
          rawText,
          ocr.recognizedLanguages
        ),
        rawText,
        ocr.lines,
        ocr.lineItems
      ),
    []
  );

  const getOrRunRawOcr = useCallback(async (imageUri: string): Promise<OcrResultPayload> => {
    const cached = ocrCacheRef.current.get(imageUri);
    if (cached?.raw) return cached.raw;
    const raw = await runOCR(imageUri);
    ocrCacheRef.current.set(imageUri, { raw, preprocessed: cached?.preprocessed });
    return raw;
  }, []);

  const getOrBuildPreprocessedOcr = useCallback((imageUri: string, rawOcr: OcrResultPayload): OcrResultPayload => {
    const cached = ocrCacheRef.current.get(imageUri);
    if (cached?.preprocessed) return cached.preprocessed;
    const preprocessed = preprocessBusinessCardOcr(rawOcr);
    ocrCacheRef.current.set(imageUri, { raw: cached?.raw ?? rawOcr, preprocessed });
    return preprocessed;
  }, []);

  const logLaneTimings = useCallback(
    (timings: ScanStageTimings): void => {
      debugScanLog("stageTimings", timings);
      void trackBusinessCardTelemetry({
        type: "scan_completed",
        details: timings,
      });
    },
    [debugScanLog]
  );

  const getOrCreatePreviewUri = useCallback(async (imageUri: string): Promise<{ previewUri: string; durationMs: number }> => {
    const cached = previewCacheRef.current.get(imageUri);
    if (cached) {
      return { previewUri: cached, durationMs: 0 };
    }

    const startedAt = Date.now();
    const previewUri = await createBusinessCardPreviewImage(imageUri, 420);
    const durationMs = Date.now() - startedAt;
    const nextPreviewUri = previewUri || imageUri;
    previewCacheRef.current.set(imageUri, nextPreviewUri);
    return { previewUri: nextPreviewUri, durationMs };
  }, []);

  const processImageFast = useCallback(
    async (imageUri: string): Promise<BusinessCardOcrResult | null> => {
      const startedAt = Date.now();
      let llmCalled = false;
      let llmTime = 0;
      let previewGenerateTime = 0;
      const ocrStartedAt = Date.now();
      const ocr = await getOrRunRawOcr(imageUri);
      const ocrTime = Date.now() - ocrStartedAt;
      const fastWindow = buildFastLaneOcrWindow(ocr);
      const rawText = fastWindow.rawText;
      if (!rawText) {
        setError(t("customer.noTextExtracted"));
        return null;
      }

      const parseStartedAt = Date.now();
      const parsed = parseBusinessCardText(rawText);
      const parseTime = Date.now() - parseStartedAt;

      if (!isLikelyBusinessCardSignal(rawText, fastWindow.lines)) {
        const earlyResult = applyQualityReview(
          withLanguageProfile(
            {
              ...parsed,
              imageUri,
              review: {
                overallConfidence: 24,
                fieldConfidence: {
                  general: 24,
                  customerName: parsed.customerName ? 36 : 8,
                  contactNameAndSurname: parsed.contactNameAndSurname ? 32 : 8,
                  email: parsed.email ? 72 : 12,
                  phone1: parsed.phone1 ? 68 : 12,
                  website: parsed.website ? 62 : 12,
                  address: parsed.address ? 28 : 8,
                },
                flags: [
                  {
                    field: "general",
                    reason: "OCR içeriği kartvizit yerine uygulama veya farklı bir ekran olabilir.",
                    severity: "high",
                  },
                ],
              },
            },
            rawText,
            ocr.recognizedLanguages
          ),
          rawText,
          fastWindow.lines,
          ocr.lineItems
        );

        debugScanLog("lowSignalEarlyExit", {
          imageUri,
          rawText,
          lines: fastWindow.lines,
        });
        logLaneTimings({
          lane: "fast",
          image_handling_time: 0,
          preview_generate_time: 0,
          ocr_time: ocrTime,
          parse_time: parseTime,
          normalize_time: 0,
          llm_time: 0,
          second_pass_time: 0,
          total_time: Date.now() - startedAt,
          llm_called: false,
        });
        return earlyResult;
      }

      const normalizeStartedAt = Date.now();
      const normalized = validateAndNormalizeBusinessCardExtraction(
        fallbackToStructuredInput(parsed),
        rawText,
        fastWindow.lines,
        undefined,
        { recognizedLanguages: ocr.recognizedLanguages },
        { mode: "light" }
      );
      const normalizeTime = Date.now() - normalizeStartedAt;
      let result = finalizeResult(normalized, imageUri, rawText, ocr);
      result = rescueNameFromTitleNeighbor(result, fastWindow.lines);
      const previewInfo = await getOrCreatePreviewUri(imageUri);
      previewGenerateTime = previewInfo.durationMs;
      result = {
        ...result,
        previewUri: previewInfo.previewUri,
      };

      debugScanLog("js_result_received", {
        lane: "fast",
        js_result_received: Date.now(),
        imageUri,
        customerName: result.customerName ?? null,
        contactNameAndSurname: result.contactNameAndSurname ?? null,
      });

      debugScanLog("fastOcr", {
        imageUri,
        rawText,
        lines: fastWindow.lines,
        originalLineCount: ocr.lines.length,
        fastLineCount: fastWindow.lines.length,
      });
      debugScanLog("fastNormalized", normalized);
      debugScanLog("fastFinalExtraction", result);
      logLaneTimings({
        lane: "fast",
        image_handling_time: 0,
        preview_generate_time: previewGenerateTime,
        ocr_time: ocrTime,
        parse_time: parseTime,
        normalize_time: normalizeTime,
        llm_time: llmTime,
        second_pass_time: 0,
        total_time: Date.now() - startedAt,
        llm_called: llmCalled,
      });
      return result;
    },
    [debugScanLog, finalizeResult, getOrCreatePreviewUri, getOrRunRawOcr, logLaneTimings, t]
  );

  const processImageAdvanced = useCallback(
    async (imageUri: string): Promise<BusinessCardOcrResult | null> => {
      const startedAt = Date.now();
      let llmCalled = false;
      let llmTime = 0;
      let secondPassTime = 0;
      let parseTimeTotal = 0;
      let normalizeTimeTotal = 0;
      let previewGenerateTime = 0;
      const ocrStartedAt = Date.now();
      const rawOcr = await getOrRunRawOcr(imageUri);
      const ocrTime = Date.now() - ocrStartedAt;
      const normalizedOcr = getOrBuildPreprocessedOcr(imageUri, rawOcr);
      const variants: Array<{ key: "primary" | "leftMajor" | "bottomUp"; payload: OcrResultPayload }> = [
        { key: "primary", payload: normalizedOcr },
      ];
      let bestResult: BusinessCardOcrResult | null = null;
      let index = 0;

      while (index < variants.length) {
        const variant = variants[index++];
        const ocr = variant.payload;
        const rawText = buildPreferredRawText(ocr);
        if (!rawText) continue;

        const parseStartedAt = Date.now();
        const candidateHints = buildBusinessCardCandidateHints(rawText, ocr.lines, ocr.lineItems);
        const parsedFallback = parseBusinessCardText(rawText);
        const parseTime = Date.now() - parseStartedAt;
        parseTimeTotal += parseTime;
        debugScanLog("ocr", {
          imageUri,
          variant: variant.key,
          originalRawText: rawOcr.rawText,
          preprocessedRawText: rawText,
          rawText,
          lines: ocr.lines,
          recognizedLanguages: ocr.recognizedLanguages,
          lineItems: ocr.lineItems.map((item) => ({
            text: item.text,
            top: item.frame?.top,
            left: item.frame?.left,
            languages: item.recognizedLanguages,
          })),
        });
        debugScanLog("candidateHints", { variant: variant.key, candidateHints });

        const normalizeStartedAt = Date.now();
        const normalizedFallback = validateAndNormalizeBusinessCardExtraction(
          fallbackToStructuredInput(parsedFallback),
          rawText,
          ocr.lines,
          candidateHints.addressLines,
          {
            preferredNameLines: candidateHints.layoutProfile.preferredNameLines,
            preferredTitleLines: candidateHints.layoutProfile.preferredTitleLines,
            preferredCompanyLines: candidateHints.layoutProfile.preferredCompanyLines,
            recognizedLanguages: ocr.recognizedLanguages,
          }
        );
        const normalizeTime = Date.now() - normalizeStartedAt;
        normalizeTimeTotal += normalizeTime;
        debugScanLog("fallbackNormalized", { variant: variant.key, normalizedFallback });
        const fallbackCandidate = finalizeResult(normalizedFallback, imageUri, rawText, ocr);

        if (variant.key === "primary" && shouldUseDeterministicFastPath(fallbackCandidate)) {
          logLaneTimings({
            lane: "advanced",
            image_handling_time: 0,
            preview_generate_time: 0,
            ocr_time: ocrTime,
            parse_time: parseTimeTotal,
            normalize_time: normalizeTimeTotal,
            llm_time: llmTime,
            second_pass_time: secondPassTime,
            total_time: Date.now() - startedAt,
            llm_called: llmCalled,
          });
          debugScanLog("finalBestExtraction", { variant: variant.key, best: fallbackCandidate, strategy: "deterministic-fast-path" });
          debugScanLog("js_result_received", {
            lane: "advanced",
            js_result_received: Date.now(),
            imageUri,
            customerName: fallbackCandidate.customerName ?? null,
            contactNameAndSurname: fallbackCandidate.contactNameAndSurname ?? null,
          });
          return fallbackCandidate;
        }

        if (variant.key === "primary" && shouldUseBalancedFastPath(fallbackCandidate)) {
          logLaneTimings({
            lane: "advanced",
            image_handling_time: 0,
            preview_generate_time: 0,
            ocr_time: ocrTime,
            parse_time: parseTimeTotal,
            normalize_time: normalizeTimeTotal,
            llm_time: llmTime,
            second_pass_time: secondPassTime,
            total_time: Date.now() - startedAt,
            llm_called: llmCalled,
          });
          debugScanLog("finalBestExtraction", { variant: variant.key, best: fallbackCandidate, strategy: "balanced-fast-path" });
          debugScanLog("js_result_received", {
            lane: "advanced",
            js_result_received: Date.now(),
            imageUri,
            customerName: fallbackCandidate.customerName ?? null,
            contactNameAndSurname: fallbackCandidate.contactNameAndSurname ?? null,
          });
          return fallbackCandidate;
        }

        if (variant.key === "primary" && shouldUseTurkishFastPath(fallbackCandidate)) {
          logLaneTimings({
            lane: "advanced",
            image_handling_time: 0,
            preview_generate_time: 0,
            ocr_time: ocrTime,
            parse_time: parseTimeTotal,
            normalize_time: normalizeTimeTotal,
            llm_time: llmTime,
            second_pass_time: secondPassTime,
            total_time: Date.now() - startedAt,
            llm_called: llmCalled,
          });
          debugScanLog("finalBestExtraction", { variant: variant.key, best: fallbackCandidate, strategy: "turkish-fast-path" });
          debugScanLog("js_result_received", {
            lane: "advanced",
            js_result_received: Date.now(),
            imageUri,
            customerName: fallbackCandidate.customerName ?? null,
            contactNameAndSurname: fallbackCandidate.contactNameAndSurname ?? null,
          });
          return fallbackCandidate;
        }

        let candidateResult: BusinessCardOcrResult;
        try {
          if (variant.key !== "primary") {
            throw new Error("SECOND_PASS_FALLBACK_ONLY");
          }
          llmCalled = true;
          const llmStartedAt = Date.now();
          const llmRawOutput = await extractBusinessCardViaLLM({
            rawText,
            ocrLines: ocr.lines,
            candidateHints,
          });
          llmTime += Date.now() - llmStartedAt;
          debugScanLog("llmRawOutput", { variant: variant.key, llmRawOutput });
          const repaired = repairJsonString(llmRawOutput);
          if (!repaired) {
            throw new Error("LLM JSON repair failed.");
          }

          const parsedJson = JSON.parse(repaired) as unknown;
          debugScanLog("llmParsedJson", { variant: variant.key, parsedJson });
          const normalized = validateAndNormalizeBusinessCardExtraction(
            parsedJson,
            rawText,
            ocr.lines,
            candidateHints.addressLines,
            {
              preferredNameLines: candidateHints.layoutProfile.preferredNameLines,
              preferredTitleLines: candidateHints.layoutProfile.preferredTitleLines,
              preferredCompanyLines: candidateHints.layoutProfile.preferredCompanyLines,
              recognizedLanguages: ocr.recognizedLanguages,
            }
          );
          debugScanLog("llmNormalized", { variant: variant.key, normalized });
          const best = pickBestBusinessCardExtraction(normalized, normalizedFallback);
          debugScanLog("finalBestExtraction", { variant: variant.key, best });
          candidateResult = finalizeResult(best, imageUri, rawText, ocr);
        } catch {
          if (__DEV__) {
            console.log("[BusinessCardScan] LLM extraction failed, regex fallback used.");
          }
          void trackBusinessCardTelemetry({ type: "llm_fallback_used" });
          debugScanLog("llmFallbackUsed", { variant: variant.key, reason: "LLM extraction failed, regex fallback used." });
          candidateResult = fallbackCandidate;
        }

        if (!bestResult) {
          bestResult = candidateResult;
        } else {
          const bestConfidence = bestResult.review?.overallConfidence ?? 0;
          const candidateConfidence = candidateResult.review?.overallConfidence ?? 0;
          if (candidateConfidence > bestConfidence) {
            bestResult = candidateResult;
          }
        }

        if (variant.key !== "primary" || !shouldRunBusinessCardSecondPass(bestResult)) {
          break;
        }

        const secondPassStartedAt = Date.now();
        const additionalVariants = buildBusinessCardOcrVariants(normalizedOcr).filter((item) => item.key !== "primary");
        secondPassTime += Date.now() - secondPassStartedAt;
        variants.push(...additionalVariants);
      }

      if (!bestResult) {
        setError(t("customer.noTextExtracted"));
        return null;
      }

      const previewInfo = await getOrCreatePreviewUri(imageUri);
      previewGenerateTime = previewInfo.durationMs;
      bestResult = {
        ...bestResult,
        previewUri: previewInfo.previewUri,
      };

      logLaneTimings({
        lane: "advanced",
        image_handling_time: 0,
        preview_generate_time: previewGenerateTime,
        ocr_time: ocrTime,
        parse_time: parseTimeTotal,
        normalize_time: normalizeTimeTotal,
        llm_time: llmTime,
        second_pass_time: secondPassTime,
        total_time: Date.now() - startedAt,
        llm_called: llmCalled,
      });
      debugScanLog("js_result_received", {
        lane: "advanced",
        js_result_received: Date.now(),
        imageUri,
        customerName: bestResult.customerName ?? null,
        contactNameAndSurname: bestResult.contactNameAndSurname ?? null,
      });
      return bestResult;
    },
    [debugScanLog, finalizeResult, getOrBuildPreprocessedOcr, getOrCreatePreviewUri, getOrRunRawOcr, logLaneTimings, t]
  );

  const scanBusinessCard = useCallback(
    async (): Promise<BusinessCardOcrResult | null> => {
      setError(null);
      setIsScanning(true);
      void trackBusinessCardTelemetry({ type: "scan_started", details: { source: "camera" } });
      try {
        const acquireStartedAt = Date.now();
        const { imageUri, usedScanner } = await captureBusinessCardFromCamera();
        const acquireTime = Date.now() - acquireStartedAt;
        void trackBusinessCardTelemetry({ type: usedScanner ? "scanner_used" : "camera_fallback_used" });
        if (!imageUri) return null;
        const result = await processImageFast(imageUri);
        if (__DEV__) {
          debugScanLog("acquireTiming", { source: "camera", acquire_time: acquireTime, imageUri });
        }
        return result;
      } catch (e) {
        const message = e instanceof Error ? e.message : "";
        if (message === "CAMERA_PERMISSION_REQUIRED") {
          setError(t("customer.cameraPermissionError"));
        } else if (message === "DOCUMENT_SCANNER_FAILED") {
          setError(t("customer.documentScannerFailed"));
        } else {
          setError(message || t("customer.scanFailed"));
        }
        void trackBusinessCardTelemetry({ type: "scan_failed", details: { source: "camera", reason: message || "unknown" } });
        return null;
      } finally {
        setIsScanning(false);
      }
    },
    [processImageFast, t]
  );

  const pickBusinessCardFromGallery = useCallback(
    async (): Promise<BusinessCardOcrResult | null> => {
      setError(null);
      setIsScanning(true);
      void trackBusinessCardTelemetry({ type: "scan_started", details: { source: "gallery" } });
      try {
        void trackBusinessCardTelemetry({ type: "gallery_used" });
        const acquireStartedAt = Date.now();
        const imageUri = await pickBusinessCardImageFromGallery();
        const acquireTime = Date.now() - acquireStartedAt;
        if (!imageUri) return null;
        const result = await processImageFast(imageUri);
        if (__DEV__) {
          debugScanLog("acquireTiming", { source: "gallery", acquire_time: acquireTime, imageUri });
        }
        return result;
      } catch (e) {
        const message = e instanceof Error ? e.message : "";
        if (message === "MEDIA_LIBRARY_PERMISSION_REQUIRED") {
          setError(t("customer.imagePermissionRequired"));
        } else {
          setError(message || t("customer.galleryPickFailed"));
        }
        void trackBusinessCardTelemetry({ type: "scan_failed", details: { source: "gallery", reason: message || "unknown" } });
        return null;
      } finally {
        setIsScanning(false);
      }
    },
    [processImageFast, t]
  );

  const retryBusinessCardExtraction = useCallback(
    async (imageUri: string): Promise<BusinessCardOcrResult | null> => {
      setError(null);
      setIsScanning(true);
      try {
        return await processImageAdvanced(imageUri);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("customer.retryScanFailed"));
        return null;
      } finally {
        setIsScanning(false);
      }
    },
    [processImageAdvanced, t]
  );

  const scanBusinessCardFromImageUri = useCallback(
    async (imageUri: string): Promise<BusinessCardOcrResult | null> => {
      setError(null);
      setIsScanning(true);
      try {
        return await processImageFast(imageUri);
      } catch (e) {
        const message = e instanceof Error ? e.message : "";
        setError(message || t("customer.scanFailed"));
        return null;
      } finally {
        setIsScanning(false);
      }
    },
    [processImageFast, t]
  );

  return { scanBusinessCard, pickBusinessCardFromGallery, scanBusinessCardFromImageUri, retryBusinessCardExtraction, isScanning, error };
}
