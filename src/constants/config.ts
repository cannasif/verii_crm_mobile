import axios from "axios";
import appConfig from "../../config.json";
import { storage } from "../lib/storage";
import { API_BASE_URL_STORAGE_KEY } from "./storage";

export const DEFAULT_API_BASE_URL = (appConfig as { apiUrl?: string }).apiUrl ?? "https://crmapi.v3rii.com";
export const API_TIMEOUT = (appConfig as { apiTimeout?: number }).apiTimeout ?? 10000;

let currentApiBaseUrl = normalizeApiBaseUrl(DEFAULT_API_BASE_URL);

function normalizeApiBaseUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error("API URL bos olamaz");
  }

  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(normalized);

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Gecersiz API URL");
  }

  return parsed.toString().replace(/\/$/, "");
}

export function getApiBaseUrl(): string {
  return currentApiBaseUrl;
}

export async function initializeApiBaseUrl(): Promise<string> {
  const storedValue = await storage.get<string>(API_BASE_URL_STORAGE_KEY);
  currentApiBaseUrl = normalizeApiBaseUrl(storedValue ?? DEFAULT_API_BASE_URL);
  return currentApiBaseUrl;
}

export async function saveApiBaseUrl(url: string): Promise<string> {
  const normalized = normalizeApiBaseUrl(url);
  await storage.set(API_BASE_URL_STORAGE_KEY, normalized);
  currentApiBaseUrl = normalized;
  return normalized;
}

export async function testApiBaseUrl(url: string): Promise<void> {
  const normalized = normalizeApiBaseUrl(url);
  const response = await axios.get(`${normalized}/api/Erp/getBranches`, {
    timeout: API_TIMEOUT,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Language": "tr",
    },
  });

  const payload = response.data as {
    success?: boolean;
    message?: string;
    exceptionMessage?: string;
    errors?: string[];
  };

  if (payload?.success === false) {
    throw new Error(
      payload.message ||
        payload.exceptionMessage ||
        (Array.isArray(payload.errors) && payload.errors.length > 0 ? payload.errors.join(", ") : "") ||
        "API baglanti testi basarisiz oldu."
    );
  }
}
