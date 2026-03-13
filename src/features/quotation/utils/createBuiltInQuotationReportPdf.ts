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

function normalizeCustomerName(value?: string | null): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";

  const erpMatch = trimmed.match(/^ERP:\s*[^-]+-\s*(.+)$/i);
  if (erpMatch?.[1]) {
    return erpMatch[1].trim();
  }

  return trimmed;
}

function buildDiscountText(line: QuotationLineFormState, currencyCode: string): string {
  const parts: string[] = [];

  if ((line.discountRate1 ?? 0) > 0 || (line.discountAmount1 ?? 0) > 0) {
    parts.push(`1:%${line.discountRate1 ?? 0}`);
  }
  if ((line.discountRate2 ?? 0) > 0 || (line.discountAmount2 ?? 0) > 0) {
    parts.push(`2:%${line.discountRate2 ?? 0}`);
  }
  if ((line.discountRate3 ?? 0) > 0 || (line.discountAmount3 ?? 0) > 0) {
    parts.push(`3:%${line.discountRate3 ?? 0}`);
  }

  const totalDiscountAmount =
    (line.discountAmount1 ?? 0) +
    (line.discountAmount2 ?? 0) +
    (line.discountAmount3 ?? 0);

  if (totalDiscountAmount > 0) {
    parts.push(`Toplam: ${formatCurrency(totalDiscountAmount, currencyCode)}`);
  }

  return parts.join(" | ") || "-";
}

function buildHtml(params: CreateBuiltInQuotationReportPdfParams): string {
  const customerName = normalizeCustomerName(params.customerName);
  const rowsHtml = params.lines
    .map((line) => {
      return `
        <tr>
          <td>${escapeHtml(line.productCode ?? "")}</td>
          <td>${escapeHtml(line.productName ?? "")}</td>
          <td>${escapeHtml(buildDiscountText(line, params.currencyCode))}</td>
          <td class="num">${escapeHtml(String(line.quantity ?? 0))}</td>
          <td class="num">${escapeHtml(formatCurrency(line.unitPrice ?? 0, params.currencyCode))}</td>
          <td class="num">%${escapeHtml(String(line.vatRate ?? 0))}</td>
          <td class="num">${escapeHtml(formatCurrency(line.lineTotal ?? 0, params.currencyCode))}</td>
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
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #111827; padding: 28px; }
          h1 { font-size: 24px; margin: 0 0 10px; }
          .meta { margin-bottom: 18px; font-size: 13px; }
          .meta-row { margin-bottom: 6px; }
          .label { font-weight: 700; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 11px; vertical-align: top; word-wrap: break-word; }
          th { background: #f3f4f6; text-align: left; }
          .num { text-align: right; }
        </style>
      </head>
      <body>
        <h1>Teklif Kalemleri</h1>
        <div class="meta">
          <div class="meta-row"><span class="label">Tarih:</span> ${escapeHtml(new Date().toLocaleDateString("tr-TR"))}</div>
          <div class="meta-row"><span class="label">Teklif No:</span> ${escapeHtml(params.offerNo ?? "-")}</div>
          ${customerName ? `<div class="meta-row"><span class="label">Müşteri Hesabı:</span> ${escapeHtml(customerName)}</div>` : ""}
        </div>
        <table>
          <thead>
            <tr>
              <th>Stok Kodu</th>
              <th>Stok Adı</th>
              <th>İskonto</th>
              <th class="num">Miktar</th>
              <th class="num">Birim Fiyat</th>
              <th class="num">KDV</th>
              <th class="num">Toplam</th>
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

export async function createBuiltInQuotationReportPdf(
  params: CreateBuiltInQuotationReportPdfParams
): Promise<string> {
  const html = buildHtml(params);
  const generated = await Print.printToFileAsync({ html });
  const generatedUri = generated.uri.startsWith("file://") ? generated.uri : `file://${generated.uri}`;

  const coverAsset = Asset.fromModule(COVER_TEMPLATE_ASSET);
  await coverAsset.downloadAsync();

  const coverUri = coverAsset.localUri ?? coverAsset.uri;
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
