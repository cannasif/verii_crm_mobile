import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import { PDFDocument } from "pdf-lib";
import { Buffer } from "buffer";

import type { QuotationLineFormState } from "../types";

const COVER_TEMPLATE_ASSET = require("../../../../assets/pdf-templates/atlas-cover-first-3-pages.pdf");

interface CreateBuiltInQuotationReportPdfParams {
  offerNo?: string | null;
  customerName?: string | null;
  currencyCode: string;
  lines: QuotationLineFormState[];
  metaFields?: Array<{ label: string; value?: string | null }>;
}

interface CurrencyPresentation {
  code: string;
  label: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCurrency(value: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: currencyCode || "TRY",
      maximumFractionDigits: 2,
    }).format(value || 0);
  } catch {
    return `${(value || 0).toFixed(2)} ${currencyCode || "TRY"}`;
  }
}

function getCurrencyPresentation(value: string | null | undefined): CurrencyPresentation {
  const normalized = String(value ?? "TRY").trim().toUpperCase();

  switch (normalized) {
    case "0":
    case "TL":
    case "TRY":
      return { code: "TRY", label: "Türk Lirası" };
    case "1":
    case "USD":
      return { code: "USD", label: "ABD Doları" };
    case "2":
    case "EUR":
      return { code: "EUR", label: "Euro" };
    case "3":
    case "GBP":
      return { code: "GBP", label: "İngiliz Sterlini" };
    default:
      return { code: normalized || "TRY", label: normalized || "Türk Lirası" };
  }
}

function normalizeCustomerName(value?: string | null): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";

  const erpMatch = trimmed.match(/^ERP:\s*[^-]+-\s*(.+)$/i);
  if (erpMatch?.[1]) {
    return erpMatch[1].trim();
  }

  return trimmed;
}

function normalizeMetaFields(
  fields: Array<{ label: string; value?: string | null }> | undefined
): Array<{ label: string; value: string }> {
  return (fields ?? [])
    .map((field) => ({
      label: field.label?.trim() ?? "",
      value: field.value?.trim() ?? "",
    }))
    .filter((field) => field.label && field.value);
}

function buildHtml(params: CreateBuiltInQuotationReportPdfParams): string {
  const customerName = normalizeCustomerName(params.customerName);
  const currency = getCurrencyPresentation(params.currencyCode);
  const metaFields = [
    ...(customerName ? [{ label: "Müşteri Hesabı", value: customerName }] : []),
    ...normalizeMetaFields(params.metaFields),
  ];
  const metaRows = metaFields
    .map(
      (field) => `
        <div class="meta-row">
          <span class="label">${escapeHtml(field.label)}:</span> ${escapeHtml(field.value)}
        </div>
      `
    )
    .join("");
  const rowsHtml = params.lines
    .map((line) => {
      return `
        <tr>
          <td>${escapeHtml(line.productCode ?? "")}</td>
          <td>${escapeHtml(line.productName ?? "")}</td>
          <td class="num">%${escapeHtml(String(line.discountRate1 ?? 0))}</td>
          <td class="num">%${escapeHtml(String(line.discountRate2 ?? 0))}</td>
          <td class="num">%${escapeHtml(String(line.discountRate3 ?? 0))}</td>
          <td class="num">${escapeHtml(String(line.quantity ?? 0))}</td>
          <td class="num">${escapeHtml(formatCurrency(line.unitPrice ?? 0, currency.code))}</td>
          <td>${escapeHtml(currency.label)}</td>
          <td class="num">%${escapeHtml(String(line.vatRate ?? 0))}</td>
          <td class="num">${escapeHtml(formatCurrency(line.lineTotal ?? 0, currency.code))}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <!doctype html>
    <html lang="tr">
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 portrait; margin: 16mm 10mm 14mm 10mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #111827; }
          h1 { font-size: 24px; margin: 0 0 10px; }
          .meta { margin-bottom: 18px; font-size: 13px; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 18px; margin-top: 8px; }
          .meta-row { margin-bottom: 0; }
          .label { font-weight: 700; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th, td { border: 1px solid #d1d5db; padding: 5px; font-size: 9px; vertical-align: top; word-wrap: break-word; }
          th { background: #f3f4f6; text-align: left; }
          .num { text-align: right; }
          .w-code { width: 11%; }
          .w-name { width: 28%; }
          .w-disc { width: 7%; }
          .w-qty { width: 7%; }
          .w-price { width: 10%; }
          .w-currency { width: 9%; }
          .w-vat { width: 6%; }
          .w-total { width: 11%; }
        </style>
      </head>
      <body>
        <h1>Teklif Kalemleri</h1>
        <div class="meta">
          <div class="meta-row"><span class="label">Tarih:</span> ${escapeHtml(new Date().toLocaleDateString("tr-TR"))}</div>
          <div class="meta-row"><span class="label">Teklif No:</span> ${escapeHtml(params.offerNo ?? "-")}</div>
          <div class="meta-row"><span class="label">Döviz:</span> ${escapeHtml(currency.label)}</div>
          ${metaRows ? `<div class="meta-grid">${metaRows}</div>` : ""}
        </div>
        <table>
          <thead>
            <tr>
              <th class="w-code">Stok Kodu</th>
              <th class="w-name">Stok Adı</th>
              <th class="w-disc num">İskonto 1</th>
              <th class="w-disc num">İskonto 2</th>
              <th class="w-disc num">İskonto 3</th>
              <th class="w-qty num">Miktar</th>
              <th class="w-price num">Birim Fiyat</th>
              <th class="w-currency">Döviz</th>
              <th class="w-vat num">KDV</th>
              <th class="w-total num">Toplam</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
    </html>
  `;
}

async function readPdfBytesFromUri(uri: string): Promise<Uint8Array> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return Uint8Array.from(Buffer.from(base64, "base64"));
}

async function resolveBundledCoverUri(): Promise<string | null> {
  try {
    const asset = Asset.fromModule(COVER_TEMPLATE_ASSET);
    if (!asset.localUri) {
      await asset.downloadAsync();
    }

    return asset.localUri ?? asset.uri ?? null;
  } catch {
    return null;
  }
}

export async function createBuiltInQuotationReportPdf(
  params: CreateBuiltInQuotationReportPdfParams
): Promise<string> {
  const html = buildHtml(params);
  const generated = await Print.printToFileAsync({ html });
  const generatedUri = generated.uri.startsWith("file://") ? generated.uri : `file://${generated.uri}`;

  const coverUri = await resolveBundledCoverUri();
  if (!coverUri) {
    return generatedUri;
  }

  const [coverBytes, linesBytes] = await Promise.all([
    readPdfBytesFromUri(coverUri),
    readPdfBytesFromUri(generatedUri),
  ]);

  const mergedPdf = await PDFDocument.create();
  const [coverPdf, linesPdf] = await Promise.all([
    PDFDocument.load(coverBytes),
    PDFDocument.load(linesBytes),
  ]);

  const coverPages = await mergedPdf.copyPages(coverPdf, coverPdf.getPageIndices());
  coverPages.forEach((page) => mergedPdf.addPage(page));

  const linePages = await mergedPdf.copyPages(linesPdf, linesPdf.getPageIndices());
  linePages.forEach((page) => mergedPdf.addPage(page));

  const mergedBytes = await mergedPdf.save();
  const outputDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!outputDir) {
    return generatedUri;
  }

  const outputUri = `${outputDir}windo-teklif-yap-${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(outputUri, Buffer.from(mergedBytes).toString("base64"), {
    encoding: FileSystem.EncodingType.Base64,
  });

  return outputUri.startsWith("file://") ? outputUri : `file://${outputUri}`;
}
