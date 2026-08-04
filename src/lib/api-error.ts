import axios from "axios";
import { getApiBaseUrl } from "../constants/config";

type ApiErrorPayload = {
  message?: string;
  exceptionMessage?: string;
  errors?: string[];
};

function extractServerMessage(payload: unknown): string {
  const data = payload as ApiErrorPayload | undefined;
  const messages = [
    data?.message,
    data?.exceptionMessage,
    ...(Array.isArray(data?.errors) ? data.errors : []),
  ]
    .map((message) => message?.trim())
    .filter((message): message is string => Boolean(message));

  return [...new Set(messages)].join(" — ");
}

export function normalizeApiRequestError(error: unknown, fallbackMessage: string, endpoint?: string): Error {
  const enhancedResponseData = (error as { response?: { data?: unknown } } | null)?.response?.data;
  const enhancedServerMessage = extractServerMessage(enhancedResponseData);
  if (enhancedServerMessage) {
    return new Error(enhancedServerMessage);
  }

  if (axios.isAxiosError(error)) {
    const serverMessage = extractServerMessage(error.response?.data);
    if (serverMessage) {
      return new Error(serverMessage);
    }

    const target = endpoint ? `${getApiBaseUrl()}${endpoint}` : getApiBaseUrl();
    if (error.response?.status) {
      return new Error(`${fallbackMessage} Sunucu ${error.response.status} döndü. URL: ${target}`);
    }

    if (error.code === "ECONNABORTED") {
      return new Error(`${fallbackMessage} İstek zaman aşımına uğradı. URL: ${target}`);
    }

    return new Error(`${fallbackMessage} API'ye ulaşılamadı. Aktif API: ${getApiBaseUrl()}`);
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(fallbackMessage);
}
