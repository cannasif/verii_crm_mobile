import { useCallback, useRef, useState } from "react";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { runOCR } from "../services/ocrService";
import { preprocessBusinessCardOcr } from "../services/businessCardOcrPreprocessService";
import { buildBusinessCardOcrVariants } from "../services/businessCardSecondPassService";
import { estimateBusinessCardRotation } from "../services/businessCardOcrGeometryService";
import { rotateAndDeskewBusinessCardImage } from "../services/businessCardNativeImageProcessor";
import { extractBusinessCardViaLLM } from "../services/businessCardLlmService";
import { buildBusinessCardCandidateHints } from "../services/businessCardHeuristics";
import { captureBusinessCardFromCamera, pickBusinessCardImageFromGallery } from "../services/businessCardCaptureService";
import { assessBusinessCardImageQuality } from "../services/businessCardImageQualityService";
import { assessBusinessCardOcrQuality, mergeReviewWithQualityAssessment } from "../services/businessCardQualityService";
import { detectQrFromImage } from "../services/businessCardQrService";
import { trackBusinessCardTelemetry } from "../services/businessCardTelemetryService";
import {
  pickBestBusinessCardExtraction,
  repairJsonString,
  toBusinessCardOcrResult,
  validateAndNormalizeBusinessCardExtraction,
} from "../schemas/businessCardSchema";
import { parseBusinessCardText } from "../utils/parseBusinessCardText";
import type { BusinessCardOcrResult } from "../types/businessCard";
import type { OcrResultPayload } from "../services/ocrService";

function fallbackToStructuredInput(parsed: BusinessCardOcrResult): {
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
    name: parsed.customerName ?? null,
    title: null,
    company: parsed.customerName ?? null,
    phones: parsed.phone1 ? [parsed.phone1] : [],
    emails: parsed.email ? [parsed.email] : [],
    website: parsed.website ?? null,
    address: parsed.address ?? null,
    social: {
      linkedin: null,
      instagram: null,
      x: null,
      facebook: null,
    },
    notes: [],
  };
}

type SourceChoice = "businessCard" | "qr" | "cancel";
type QualityGateChoice = "continue" | "retry" | "cancel";

function mergeQrNotes(current: string | undefined, qrNote: string): string {
  if (!current) return qrNote;
  if (current.includes(qrNote)) return current;
  return `${current}\n${qrNote}`;
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
      customerConfidence >= 80 &&
      contactConfidence >= 78 &&
      phoneConfidence >= 85 &&
      Math.max(emailConfidence, websiteConfidence, addressConfidence) >= 60 &&
      !hasCriticalHighFlag
  );
}

export function useBusinessCardScan(): {
  scanBusinessCard: () => Promise<BusinessCardOcrResult | null>;
  pickBusinessCardFromGallery: () => Promise<BusinessCardOcrResult | null>;
  retryBusinessCardExtraction: (imageUri: string) => Promise<BusinessCardOcrResult | null>;
  isScanning: boolean;
  error: string | null;
} {
  const { t } = useTranslation();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ocrCacheRef = useRef(new Map<string, OcrResultPayload>());

  const debugScanLog = useCallback((stage: string, payload: unknown) => {
    if (!__DEV__) return;
    console.log(`[BusinessCardScan] ${stage}`, payload);
  }, []);

  const processImage = useCallback(
    async (
      imageUri: string,
      preloadedOcr?: OcrResultPayload | null,
      options?: { allowSecondPass?: boolean }
    ): Promise<BusinessCardOcrResult | null> => {
      const rawOcr = preloadedOcr ?? await runOCR(imageUri);
      const normalizedOcr = preprocessBusinessCardOcr(rawOcr);
      ocrCacheRef.current.set(imageUri, normalizedOcr);
      const variants = options?.allowSecondPass === false
        ? [{ key: "primary" as const, payload: normalizedOcr }]
        : buildBusinessCardOcrVariants(normalizedOcr);
      let bestResult: BusinessCardOcrResult | null = null;

      for (const variant of variants) {
        const ocr = variant.payload;
        const rawText = (ocr.rawText || ocr.lines.join("\n")).trim();
        if (!rawText) continue;

        const candidateHints = buildBusinessCardCandidateHints(rawText, ocr.lines, ocr.lineItems);
        const parsedFallback = parseBusinessCardText(rawText);
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
        debugScanLog("fallbackNormalized", { variant: variant.key, normalizedFallback });
        const fallbackCandidate = applyQualityReview({
          ...toBusinessCardOcrResult(normalizedFallback),
          imageUri,
        }, rawText, ocr.lines, ocr.lineItems);

        if (variant.key === "primary" && shouldUseDeterministicFastPath(fallbackCandidate)) {
          debugScanLog("finalBestExtraction", { variant: variant.key, best: fallbackCandidate, strategy: "deterministic-fast-path" });
          return fallbackCandidate;
        }

        let candidateResult: BusinessCardOcrResult;
        try {
          if (variant.key !== "primary") {
            throw new Error("SECOND_PASS_FALLBACK_ONLY");
          }
          const llmRawOutput = await extractBusinessCardViaLLM({
            rawText,
            ocrLines: ocr.lines,
            candidateHints,
          });
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
          candidateResult = applyQualityReview({
            ...toBusinessCardOcrResult(best),
            imageUri,
          }, rawText, ocr.lines, ocr.lineItems);
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

        if (!shouldRunBusinessCardSecondPass(bestResult)) {
          break;
        }
      }

      if (!bestResult) {
        setError(t("customer.noTextExtracted"));
        return null;
      }

      return bestResult;
    },
    [debugScanLog, t]
  );

  const askDetectedSourceChoice = useCallback(async (): Promise<SourceChoice> => {
    return await new Promise((resolve) => {
      Alert.alert(
        t("customer.qrDetectedTitle"),
        t("customer.qrDetectedMessage"),
        [
          {
            text: t("common.cancel"),
            style: "cancel",
            onPress: () => resolve("cancel"),
          },
          {
            text: t("customer.processAsQr"),
            onPress: () => resolve("qr"),
          },
          {
            text: t("customer.processAsBusinessCard"),
            onPress: () => resolve("businessCard"),
          },
        ],
        { cancelable: true, onDismiss: () => resolve("cancel") }
      );
    });
  }, [t]);

  const askImageQualityChoice = useCallback(
    async (assessment: Awaited<ReturnType<typeof assessBusinessCardImageQuality>>): Promise<QualityGateChoice> => {
      const messageLines = [
        t("customer.ocrImageQualityWarning", { score: assessment.score }),
        ...assessment.flags.slice(0, 3).map((flag) => `• ${t(flag.reasonKey)}`),
      ];

      return await new Promise((resolve) => {
        Alert.alert(
          t("customer.ocrImageQualityTitle"),
          messageLines.join("\n"),
          [
            {
              text: t("common.cancel"),
              style: "cancel",
              onPress: () => resolve("cancel"),
            },
            {
              text: t("common.retry"),
              onPress: () => resolve("retry"),
            },
            {
              text: t("customer.ocrImageQualityContinue"),
              onPress: () => resolve("continue"),
            },
          ],
          { cancelable: true, onDismiss: () => resolve("cancel") }
        );
      });
    },
    [t]
  );

  const runImageQualityGate = useCallback(
    async (imageUri: string, usedScanner: boolean, imageRotation?: number | null): Promise<QualityGateChoice> => {
      const assessment = await assessBusinessCardImageQuality(imageUri, { usedScanner, imageRotation });
      if (!assessment.shouldWarn) {
        return "continue";
      }

      void trackBusinessCardTelemetry({
        type: "image_quality_warned",
        details: {
          score: assessment.score,
          usedScanner,
          width: assessment.width,
          height: assessment.height,
          flagCount: assessment.flags.length,
        },
      });

      return await askImageQualityChoice(assessment);
    },
    [askImageQualityChoice]
  );

  const resolveImageInput = useCallback(
    async (
      imageUri: string
    ): Promise<{ shouldContinueWithOcr: boolean; qrResult: BusinessCardOcrResult | null }> => {
      const qrDetection = await detectQrFromImage(imageUri);
      if (!qrDetection.rawValue) {
        return { shouldContinueWithOcr: true, qrResult: null };
      }
      void trackBusinessCardTelemetry({ type: "qr_detected", details: { hasStructuredPayload: Boolean(qrDetection.parsedCard) } });

      const choice = await askDetectedSourceChoice();
      if (choice === "cancel") {
        void trackBusinessCardTelemetry({ type: "qr_cancelled" });
        return { shouldContinueWithOcr: false, qrResult: null };
      }

      if (choice === "businessCard") {
        return { shouldContinueWithOcr: true, qrResult: null };
      }

      if (!qrDetection.parsedCard) {
        setError(t("customer.unsupportedQrPayload"));
        return { shouldContinueWithOcr: false, qrResult: null };
      }

      void trackBusinessCardTelemetry({ type: "qr_processed", details: { hasStructuredPayload: true } });

      return {
        shouldContinueWithOcr: false,
        qrResult: {
          ...qrDetection.parsedCard,
          imageUri,
          notes: mergeQrNotes(qrDetection.parsedCard.notes, t("customer.qrImportedNote")),
        },
      };
    },
    [askDetectedSourceChoice, t]
  );

  const scanBusinessCard = useCallback(
    async (): Promise<BusinessCardOcrResult | null> => {
      setError(null);
      setIsScanning(true);
      void trackBusinessCardTelemetry({ type: "scan_started", details: { source: "camera" } });
      try {
        for (;;) {
          const { imageUri, usedScanner } = await captureBusinessCardFromCamera();
          void trackBusinessCardTelemetry({ type: usedScanner ? "scanner_used" : "camera_fallback_used" });
          if (!imageUri) return null;

          const resolution = await resolveImageInput(imageUri);
          if (resolution.qrResult) return resolution.qrResult;
          if (!resolution.shouldContinueWithOcr) return null;

          const previewOcr = preprocessBusinessCardOcr(await runOCR(imageUri));
          const estimatedRotation = estimateBusinessCardRotation(previewOcr.lineItems);
          const correctedImageUri =
            typeof estimatedRotation === "number" && Math.abs(estimatedRotation) >= 4
              ? await rotateAndDeskewBusinessCardImage(imageUri, estimatedRotation)
              : imageUri;
          const effectiveImageUri = correctedImageUri || imageUri;
          const effectiveRotation = correctedImageUri !== imageUri ? 0 : estimatedRotation;
          const qualityChoice = await runImageQualityGate(effectiveImageUri, usedScanner, effectiveRotation);
          if (qualityChoice === "cancel") return null;
          if (qualityChoice === "retry") {
            void trackBusinessCardTelemetry({ type: "image_quality_retry_selected", details: { source: "camera" } });
            continue;
          }

          const effectiveOcr =
            effectiveImageUri === imageUri
              ? previewOcr
              : preprocessBusinessCardOcr(await runOCR(effectiveImageUri));
          ocrCacheRef.current.set(effectiveImageUri, effectiveOcr);
          const result = await processImage(effectiveImageUri, effectiveOcr);
          if (result) {
            void trackBusinessCardTelemetry({ type: "scan_completed", details: { source: "camera", reviewConfidence: result.review?.overallConfidence ?? null } });
          }
          return result;
        }
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
    [processImage, resolveImageInput, runImageQualityGate, t]
  );

  const pickBusinessCardFromGallery = useCallback(
    async (): Promise<BusinessCardOcrResult | null> => {
      setError(null);
      setIsScanning(true);
      void trackBusinessCardTelemetry({ type: "scan_started", details: { source: "gallery" } });
      try {
        void trackBusinessCardTelemetry({ type: "gallery_used" });
        for (;;) {
          const imageUri = await pickBusinessCardImageFromGallery();
          if (!imageUri) return null;
          const resolution = await resolveImageInput(imageUri);
          if (resolution.qrResult) return resolution.qrResult;
          if (!resolution.shouldContinueWithOcr) return null;

          const previewOcr = preprocessBusinessCardOcr(await runOCR(imageUri));
          const estimatedRotation = estimateBusinessCardRotation(previewOcr.lineItems);
          const correctedImageUri =
            typeof estimatedRotation === "number" && Math.abs(estimatedRotation) >= 4
              ? await rotateAndDeskewBusinessCardImage(imageUri, estimatedRotation)
              : imageUri;
          const effectiveImageUri = correctedImageUri || imageUri;
          const effectiveRotation = correctedImageUri !== imageUri ? 0 : estimatedRotation;
          const qualityChoice = await runImageQualityGate(effectiveImageUri, false, effectiveRotation);
          if (qualityChoice === "cancel") return null;
          if (qualityChoice === "retry") {
            void trackBusinessCardTelemetry({ type: "image_quality_retry_selected", details: { source: "gallery" } });
            continue;
          }

          const effectiveOcr =
            effectiveImageUri === imageUri
              ? previewOcr
              : preprocessBusinessCardOcr(await runOCR(effectiveImageUri));
          ocrCacheRef.current.set(effectiveImageUri, effectiveOcr);
          const result = await processImage(effectiveImageUri, effectiveOcr);
          if (result) {
            void trackBusinessCardTelemetry({ type: "scan_completed", details: { source: "gallery", reviewConfidence: result.review?.overallConfidence ?? null } });
          }
          return result;
        }
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
    [processImage, resolveImageInput, runImageQualityGate, t]
  );

  const retryBusinessCardExtraction = useCallback(
    async (imageUri: string): Promise<BusinessCardOcrResult | null> => {
      setError(null);
      setIsScanning(true);
      try {
        return await processImage(imageUri, ocrCacheRef.current.get(imageUri) ?? null, { allowSecondPass: false });
      } catch (e) {
        setError(e instanceof Error ? e.message : t("customer.retryScanFailed"));
        return null;
      } finally {
        setIsScanning(false);
      }
    },
    [processImage, t]
  );

  return { scanBusinessCard, pickBusinessCardFromGallery, retryBusinessCardExtraction, isScanning, error };
}
