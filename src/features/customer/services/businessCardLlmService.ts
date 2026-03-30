import { apiClient } from "../../../lib/axios";
import {
  buildBusinessCardUserPrompt,
  BUSINESS_CARD_SYSTEM_PROMPT,
  type BusinessCardPromptCandidateHints,
} from "./businessCardPromptTemplates";

export interface ExtractBusinessCardViaLlmInput {
  rawText: string;
  ocrLines?: string[];
  candidateHints?: BusinessCardPromptCandidateHints;
}

type LlmExtractRequest = {
  systemPrompt: string;
  userPrompt: string;
  rawText: string;
  ocrLines?: string[];
  candidateHints?: BusinessCardPromptCandidateHints;
};

type LlmExtractResponse = {
  success?: boolean;
  data?: unknown;
  message?: string;
};

function coerceToString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const candidates = [record.outputText, record.text, record.content, record.result, record.json];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }
  return null;
}

export async function extractBusinessCardViaLLM(input: string | ExtractBusinessCardViaLlmInput): Promise<string> {
  const rawText = typeof input === "string" ? input : input.rawText;
  const ocrLines = typeof input === "string" ? undefined : input.ocrLines;
  const candidateHints = typeof input === "string" ? undefined : input.candidateHints;
  const text = rawText?.trim();
  if (!text) {
    throw new Error("Empty OCR text.");
  }

  const payload: LlmExtractRequest = {
    systemPrompt: BUSINESS_CARD_SYSTEM_PROMPT,
    userPrompt: buildBusinessCardUserPrompt(text, { ocrLines, candidateHints }),
    rawText: text,
    ocrLines,
    candidateHints,
  };

  const response = await apiClient.post<LlmExtractResponse>("/api/ai/business-card/extract", payload, {
    // Keep the review flow responsive; fall back to deterministic parsing on timeout.
    timeout: 5000,
  });
  const body = response.data;

  if (body?.success === false) {
    throw new Error(body.message || "LLM extraction failed.");
  }

  const topLevelText = coerceToString(body);
  if (topLevelText) return topLevelText;

  const nestedText = coerceToString(body?.data);
  if (nestedText) return nestedText;

  if (body?.data && typeof body.data === "object") {
    return JSON.stringify(body.data);
  }

  throw new Error("LLM extraction response is not parseable.");
}
