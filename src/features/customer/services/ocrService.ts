import { Platform } from "react-native";
import TextRecognition from "@react-native-ml-kit/text-recognition";
import * as FileSystem from "expo-file-system/legacy";

export interface OcrLineItem {
  blockIndex: number;
  lineIndex: number;
  text: string;
  elementsCount?: number;
  frame?: {
    width: number;
    height: number;
    top: number;
    left: number;
  };
  cornerPoints?: Array<{ x: number; y: number }>;
  recognizedLanguages?: string[];
}

export interface OcrResultPayload {
  rawText: string;
  lines: string[];
  lineItems: OcrLineItem[];
  recognizedLanguages: string[];
  metrics?: {
    blockCount: number;
    lineCount: number;
    elementCount: number;
  };
}

type OcrNativeFrame = { width?: unknown; height?: unknown; top?: unknown; left?: unknown };
type OcrNativePoint = { x?: unknown; y?: unknown };
type OcrNativeLanguage = { languageCode?: unknown };
type OcrNativeLine = {
  text?: unknown;
  value?: unknown;
  content?: unknown;
  string?: unknown;
  elements?: unknown;
  frame?: unknown;
  cornerPoints?: unknown;
  recognizedLanguages?: unknown;
};
type OcrNativeBlock = { lines?: unknown; text?: unknown; frame?: unknown; cornerPoints?: unknown; recognizedLanguages?: unknown };
type OcrNativeResult = { text?: unknown; lines?: unknown; blocks?: unknown };
const ocrUriCache = new Map<string, string>();

function debugOcrLog(stage: string, payload: unknown): void {
  console.log(`[BusinessCardOCR] ${stage}`, payload);
}

function getUriScheme(uri: string): string {
  const match = uri.match(/^([a-z]+):\/\//i);
  return match?.[1]?.toLowerCase() ?? (uri.startsWith("/") ? "path" : "unknown");
}

function guessExtension(uri: string): string {
  const cleaned = uri.split("?")[0]?.split("#")[0] ?? uri;
  const ext = cleaned.split(".").pop()?.toLowerCase();
  if (ext && /^[a-z0-9]{2,5}$/.test(ext)) return ext;
  return "jpg";
}

async function materializeOcrUri(imageUri: string): Promise<string> {
  if (!imageUri.startsWith("content://")) {
    return imageUri;
  }

  const cached = ocrUriCache.get(imageUri);
  if (cached) {
    return cached;
  }

  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!baseDir) {
    return imageUri;
  }

  const targetUri = `${baseDir}business-card-ocr-${Date.now()}.${guessExtension(imageUri)}`;
  try {
    const startedAt = Date.now();
    await FileSystem.copyAsync({ from: imageUri, to: targetUri });
    const info = await FileSystem.getInfoAsync(targetUri);
    ocrUriCache.set(imageUri, targetUri);
    debugOcrLog("materializedUri", {
      sourceScheme: "content",
      targetUri,
      size: (info as { size?: number }).size ?? null,
      materializeMs: Date.now() - startedAt,
    });
    return targetUri;
  } catch (error) {
    debugOcrLog("materializeFailed", {
      imageUri,
      message: error instanceof Error ? error.message : String(error),
    });
    return imageUri;
  }
}

function toCleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : null;
}

function getLineText(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return toCleanText(value);
  }

  const line = value as OcrNativeLine;
  return (
    toCleanText(line.text) ??
    toCleanText(line.value) ??
    toCleanText(line.content) ??
    toCleanText(line.string)
  );
}

function uniqueLines(values: string[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    if (!out.includes(value)) {
      out.push(value);
    }
  }
  return out;
}

function toFrame(value: unknown): OcrLineItem["frame"] | undefined {
  if (!value || typeof value !== "object") return undefined;
  const frame = value as OcrNativeFrame;
  const width = typeof frame.width === "number" ? frame.width : Number(frame.width);
  const height = typeof frame.height === "number" ? frame.height : Number(frame.height);
  const top = typeof frame.top === "number" ? frame.top : Number(frame.top);
  const left = typeof frame.left === "number" ? frame.left : Number(frame.left);
  if ([width, height, top, left].some((part) => Number.isNaN(part))) return undefined;
  return { width, height, top, left };
}

function toCornerPoints(value: unknown): OcrLineItem["cornerPoints"] | undefined {
  if (!Array.isArray(value)) return undefined;
  const points = value
    .map((point) => {
      if (!point || typeof point !== "object") return null;
      const native = point as OcrNativePoint;
      const x = typeof native.x === "number" ? native.x : Number(native.x);
      const y = typeof native.y === "number" ? native.y : Number(native.y);
      if (Number.isNaN(x) || Number.isNaN(y)) return null;
      return { x, y };
    })
    .filter((point): point is { x: number; y: number } => Boolean(point));
  return points.length > 0 ? points : undefined;
}

function toRecognizedLanguages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const language = item as OcrNativeLanguage;
      return typeof language.languageCode === "string" ? language.languageCode.trim() : null;
    })
    .filter((item): item is string => Boolean(item));
}

function extractLineItems(result: unknown): OcrLineItem[] {
  if (!result || typeof result !== "object") return [];

  const native = result as OcrNativeResult;
  const out: OcrLineItem[] = [];
  const blocks = Array.isArray(native.blocks) ? native.blocks : [];

  if (blocks.length > 0) {
    blocks.forEach((blockValue, blockIndex) => {
      if (!blockValue || typeof blockValue !== "object") return;
      const block = blockValue as OcrNativeBlock;
      const lines = Array.isArray(block.lines) ? block.lines : [];
      if (lines.length > 0) {
        lines.forEach((lineValue, lineIndex) => {
          const text = getLineText(lineValue);
          if (text) {
            const nativeLine = (lineValue && typeof lineValue === "object" ? lineValue : {}) as OcrNativeLine;
            out.push({
              blockIndex,
              lineIndex,
              text,
              elementsCount: Array.isArray(nativeLine.elements) ? nativeLine.elements.length : undefined,
              frame: toFrame(nativeLine.frame ?? block.frame),
              cornerPoints: toCornerPoints(nativeLine.cornerPoints ?? block.cornerPoints),
              recognizedLanguages: toRecognizedLanguages(nativeLine.recognizedLanguages ?? block.recognizedLanguages),
            });
          }
        });
        return;
      }

      const blockText = toCleanText(block.text);
      if (blockText) {
        out.push({
          blockIndex,
          lineIndex: 0,
          text: blockText,
          frame: toFrame(block.frame),
          cornerPoints: toCornerPoints(block.cornerPoints),
          recognizedLanguages: toRecognizedLanguages(block.recognizedLanguages),
        });
      }
    });
  }

  const topLines = Array.isArray(native.lines) ? native.lines : [];
  if (out.length === 0 && topLines.length > 0) {
    topLines.forEach((lineValue, lineIndex) => {
      const text = getLineText(lineValue);
      if (text) {
        const nativeLine = (lineValue && typeof lineValue === "object" ? lineValue : {}) as OcrNativeLine;
        out.push({
          blockIndex: 0,
          lineIndex,
          text,
          elementsCount: Array.isArray(nativeLine.elements) ? nativeLine.elements.length : undefined,
          frame: toFrame(nativeLine.frame),
          cornerPoints: toCornerPoints(nativeLine.cornerPoints),
          recognizedLanguages: toRecognizedLanguages(nativeLine.recognizedLanguages),
        });
      }
    });
  }

  return out;
}

function toPayload(result: unknown): OcrResultPayload {
  const native = (result ?? {}) as OcrNativeResult;
  const rawText = toCleanText(native.text) ?? "";
  const lineItems = extractLineItems(result);

  const lineTexts = lineItems.map((item) => item.text);
  const recognizedLanguages = uniqueLines(lineItems.flatMap((item) => item.recognizedLanguages ?? []));
  const elementCount = lineItems.reduce((sum, item) => sum + (item.elementsCount ?? 0), 0);
  const fallbackLines = rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const lines = uniqueLines(lineTexts.length > 0 ? lineTexts : fallbackLines);
  return {
    rawText,
    lines,
    lineItems,
    recognizedLanguages,
    metrics: {
      blockCount: Array.isArray(native.blocks) ? native.blocks.length : 0,
      lineCount: lineItems.length,
      elementCount,
    },
  };
}

async function visionOCR(imageUri: string): Promise<OcrResultPayload> {
  const result = await TextRecognition.recognize(imageUri);
  return toPayload(result);
}

async function mlKitOCR(imageUri: string): Promise<OcrResultPayload> {
  const result = await TextRecognition.recognize(imageUri);
  return toPayload(result);
}

export async function runOCR(imageUri: string): Promise<OcrResultPayload> {
  if (!imageUri || typeof imageUri !== "string") {
    return { rawText: "", lines: [], lineItems: [], recognizedLanguages: [], metrics: { blockCount: 0, lineCount: 0, elementCount: 0 } };
  }
  try {
    const startedAt = Date.now();
    debugOcrLog("ocr_start", { ocr_start: startedAt, imageUri, sourceScheme: getUriScheme(imageUri) });
    let readableUri = imageUri;
    const sourceInfo = await FileSystem.getInfoAsync(imageUri).catch(() => null);
    if (Platform.OS === "android") {
      readableUri = await materializeOcrUri(imageUri);
    }
    const readableInfo =
      readableUri === imageUri ? sourceInfo : await FileSystem.getInfoAsync(readableUri).catch(() => null);

    if (Platform.OS === "ios") {
      const result = await visionOCR(readableUri);
      debugOcrLog("completed", {
        platform: Platform.OS,
        sourceScheme: getUriScheme(imageUri),
        readableScheme: getUriScheme(readableUri),
        sourceSize: (sourceInfo as { size?: number } | null)?.size ?? null,
        readableSize: (readableInfo as { size?: number } | null)?.size ?? null,
        ocrMs: Date.now() - startedAt,
        lines: result.lines.length,
        blocks: result.metrics?.blockCount ?? null,
      });
      debugOcrLog("ocr_end", { ocr_end: Date.now(), ocrMs: Date.now() - startedAt, lines: result.lines.length });
      return result;
    }
    if (Platform.OS === "android") {
      const result = await mlKitOCR(readableUri);
      debugOcrLog("completed", {
        platform: Platform.OS,
        sourceScheme: getUriScheme(imageUri),
        readableScheme: getUriScheme(readableUri),
        sourceSize: (sourceInfo as { size?: number } | null)?.size ?? null,
        readableSize: (readableInfo as { size?: number } | null)?.size ?? null,
        ocrMs: Date.now() - startedAt,
        lines: result.lines.length,
        blocks: result.metrics?.blockCount ?? null,
      });
      debugOcrLog("ocr_end", { ocr_end: Date.now(), ocrMs: Date.now() - startedAt, lines: result.lines.length });
      return result;
    }
    return { rawText: "", lines: [], lineItems: [], recognizedLanguages: [], metrics: { blockCount: 0, lineCount: 0, elementCount: 0 } };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(
      message.includes("native") || message.includes("linking")
        ? "OCR için geliştirme build gerekli. Expo Go desteklenmez."
        : `OCR hatası: ${message}`
    );
  }
}
