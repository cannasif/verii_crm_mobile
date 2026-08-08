import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import { PDFDocument } from "pdf-lib";
import { Buffer } from "buffer";

import type { QuotationLineFormState } from "../types";

const COVER_TEMPLATE_ASSET = require("../../../../assets/pdf-templates/atlas-cover-first-3-pages.pdf");
const BRAND_LOGO_ASSET = require("../../../../assets/windoformlogo.png");
const REFERENCE_IMAGE_ASSETS = [
  require("../../../../assets/veriicrmlogo.png"),
  require("../../../../assets/v3logo.png"),
  require("../../../../assets/icon.png"),
] as const;

const COMPANY_NAME = "WINDOFORM KAPI & PENCERE AKS.";
const COMPANY_CONTACT_LINES = [
  "Kazım Karabekir Mah. 8501 Sokak No:7-B D:18 Buca / İzmir",
  "(0232) 854 70 00",
  "info@windoform.com.tr",
];
const TERMS_LINES = [
  "Yukarıdaki fiyatlara KDV dahil değildir.",
  "Bu teklif oluşturulduktan sonra 15 gün geçerlidir.",
  "Fiyatlara fabrika teslimi (veya belirtilen teslim şekline göre) fiyatlandırma dahildir.",
  "Ödemeler sipariş onayı ile %30 peşin, kalan teslimatta yapılır.",
  "Belirtilen teslim tarihi sipariş onayından itibaren geçerlidir.",
];

interface CreateBuiltInQuotationReportPdfParams {
  offerNo?: string | null;
  customerName?: string | null;
  currencyCode: string;
  lines: QuotationLineFormState[];
  representativeName?: string | null;
  address?: string | null;
  shippingAddress?: string | null;
  erpCustomerCode?: string | null;
  offerDate?: string | null;
  deliveryDate?: string | null;
  validUntil?: string | null;
  paymentTypeName?: string | null;
  salesTypeName?: string | null;
  projectCode?: string | null;
  description?: string | null;
  notes?: string[];
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

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const normalized = value.includes("T") ? value.split("T")[0] : value;
  const date = new Date(`${normalized}T12:00:00`);
  if (Number.isNaN(date.getTime())) return normalized;
  return date.toLocaleDateString("tr-TR");
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

function buildDescription(line: QuotationLineFormState): string {
  const extra = [line.description1, line.description2, line.description3]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean)
    .join(" • ");

  return extra ? `${line.productName}\n${extra}` : line.productName;
}

function buildDiscountSummary(line: QuotationLineFormState): string {
  return [
    line.discountRate1 ? `%${line.discountRate1}` : "%0",
    line.discountRate2 ? `%${line.discountRate2}` : "%0",
    line.discountRate3 ? `%${line.discountRate3}` : "%0",
  ].join(" / ");
}

function calculateTotals(lines: QuotationLineFormState[]) {
  return lines.reduce(
    (acc, line) => {
      const grossLineTotal = (line.quantity || 0) * (line.unitPrice || 0);
      const discountAmount =
        (line.discountAmount1 || 0) + (line.discountAmount2 || 0) + (line.discountAmount3 || 0);
      const netTotal = line.lineTotal || 0;
      const vatTotal = line.vatAmount || Math.max((line.lineGrandTotal || 0) - netTotal, 0);
      const grandTotal = line.lineGrandTotal || netTotal + vatTotal;

      acc.grossTotal += grossLineTotal;
      acc.discountTotal += discountAmount;
      acc.netTotal += netTotal;
      acc.vatTotal += vatTotal;
      acc.grandTotal += grandTotal;
      return acc;
    },
    { grossTotal: 0, discountTotal: 0, netTotal: 0, vatTotal: 0, grandTotal: 0 }
  );
}

async function readPdfBytesFromUri(uri: string): Promise<Uint8Array> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return Uint8Array.from(Buffer.from(base64, "base64"));
}

async function readAssetAsDataUri(moduleId: number): Promise<string | null> {
  try {
    const asset = Asset.fromModule(moduleId);
    if (!asset.localUri) {
      await asset.downloadAsync();
    }

    const sourceUri = asset.localUri ?? asset.uri;
    if (!sourceUri) return null;

    const base64 = await FileSystem.readAsStringAsync(sourceUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const extension = sourceUri.split(".").pop()?.toLowerCase();
    const mimeType =
      extension === "jpg" || extension === "jpeg"
        ? "image/jpeg"
        : extension === "png"
          ? "image/png"
          : "application/octet-stream";

    return `data:${mimeType};base64,${base64}`;
  } catch {
    return null;
  }
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

function buildHtml(
  params: CreateBuiltInQuotationReportPdfParams,
  logoDataUri: string | null,
  referenceImages: Array<string | null>
): string {
  const customerName = normalizeCustomerName(params.customerName);
  const currency = getCurrencyPresentation(params.currencyCode);
  const totals = calculateTotals(params.lines);
  const customerDetailLines = [
    customerName,
    params.representativeName ? `Satınalma Departmanı: ${params.representativeName}` : "",
    params.address || params.shippingAddress || "",
    params.erpCustomerCode || "",
  ].filter(Boolean);
  const noteLines = [
    ...normalizeMetaFields(params.metaFields).map((field) => `${field.label}: ${field.value}`),
    ...(params.description ? [params.description] : []),
    ...(params.notes ?? []).filter((item) => item.trim().length > 0),
  ].slice(0, 6);
  const renderedTerms = noteLines.length > 0 ? noteLines : TERMS_LINES;

  const rowsHtml = params.lines
    .map(
      (line) => `
        <tr>
          <td class="img-col">
            <div class="thumb-box">
              ${
                logoDataUri
                  ? `<img src="${logoDataUri}" alt="thumb" class="thumb-image" />`
                  : `<div class="thumb-fallback">WF</div>`
              }
            </div>
          </td>
          <td>${escapeHtml(line.productCode ?? "")}</td>
          <td>
            <div class="product-name">${escapeHtml(line.productName ?? "")}</div>
            <div class="product-desc">${escapeHtml(buildDescription(line))}</div>
          </td>
          <td class="center">${escapeHtml(String(line.quantity ?? 0))}</td>
          <td class="num">${escapeHtml(formatCurrency(line.unitPrice ?? 0, currency.code))}</td>
          <td class="num">${escapeHtml(buildDiscountSummary(line))}</td>
          <td class="num">${escapeHtml(formatCurrency(line.lineTotal ?? 0, currency.code))}</td>
        </tr>
      `
    )
    .join("");

  const refCardsHtml = referenceImages
    .map(
      (image, index) => `
        <div class="reference-card">
          ${
            image
              ? `<img src="${image}" alt="reference-${index + 1}" class="reference-image" />`
              : `<div class="reference-image reference-fallback">Referans ${index + 1}</div>`
          }
          <div class="reference-caption">Referans ${index + 1}</div>
        </div>
      `
    )
    .join("");

  return `
    <!doctype html>
    <html lang="tr">
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 portrait; margin: 8mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            color: #334155;
            background: #ffffff;
          }
          .page {
            border-top: 4px solid #345a99;
            padding: 6mm 4mm 6mm;
          }
          .top-grid, .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .card {
            border: 1px solid #d9e0ea;
            border-radius: 10px;
            background: #ffffff;
          }
          .logo-card {
            min-height: 118px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            text-align: center;
          }
          .logo-card img {
            width: 180px;
            max-width: 85%;
            object-fit: contain;
          }
          .logo-fallback {
            color: #345a99;
            font-size: 32px;
            font-weight: 800;
            letter-spacing: 1px;
          }
          .offer-card {
            padding: 16px 18px;
            min-height: 118px;
          }
          .offer-title {
            color: #345a99;
            font-size: 14px;
            font-weight: 800;
            letter-spacing: 0.6px;
            margin-bottom: 12px;
          }
          .meta-line {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 8px;
            font-size: 11px;
          }
          .meta-line .label {
            color: #64748b;
          }
          .meta-line .value {
            font-weight: 700;
            color: #334155;
          }
          .company-card, .customer-card {
            padding: 14px 16px;
            min-height: 108px;
          }
          .card-title {
            color: #345a99;
            font-size: 13px;
            font-weight: 800;
            margin-bottom: 10px;
          }
          .muted-tag {
            color: #a8b1bf;
            font-size: 9px;
            font-weight: 700;
            letter-spacing: 0.6px;
            margin-bottom: 4px;
          }
          .company-line, .customer-line {
            font-size: 10px;
            line-height: 1.55;
            margin: 0 0 4px;
          }
          .table-wrap {
            margin-top: 14px;
            border: 1px solid #d9e0ea;
            border-radius: 10px;
            overflow: hidden;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          thead th {
            background: #345a99;
            color: #ffffff;
            font-size: 9px;
            padding: 8px 6px;
            text-align: left;
          }
          tbody td {
            border-top: 1px solid #e4e9f1;
            font-size: 9px;
            padding: 8px 6px;
            vertical-align: top;
          }
          .img-col { width: 11%; }
          .code-col { width: 15%; }
          .name-col { width: 33%; }
          .qty-col { width: 10%; }
          .price-col { width: 13%; }
          .discount-col { width: 10%; }
          .total-col { width: 15%; }
          .thumb-box {
            width: 34px;
            height: 34px;
            border: 1px solid #d5dde8;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            background: #ffffff;
          }
          .thumb-image {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .thumb-fallback {
            color: #345a99;
            font-size: 10px;
            font-weight: 700;
          }
          .product-name {
            font-weight: 700;
            color: #334155;
            margin-bottom: 3px;
          }
          .product-desc {
            color: #64748b;
            white-space: pre-line;
            line-height: 1.35;
          }
          .center { text-align: center; }
          .num { text-align: right; }
          .summary-grid {
            display: grid;
            grid-template-columns: 1fr 200px;
            gap: 16px;
            margin-top: 16px;
            align-items: start;
          }
          .approval-box {
            border: 1px dashed #b8c1cf;
            border-radius: 8px;
            min-height: 88px;
            padding: 12px;
          }
          .approval-title {
            color: #94a3b8;
            font-size: 10px;
            font-weight: 700;
            margin-bottom: 28px;
          }
          .approval-line {
            border-top: 1px solid #c9d1de;
            width: 70%;
            margin: 0 auto 8px;
          }
          .approval-caption {
            color: #94a3b8;
            font-size: 9px;
            text-align: center;
          }
          .total-box {
            border: 1px solid #d9e0ea;
            border-radius: 10px;
            padding: 12px 14px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 10px;
          }
          .total-row.discount {
            color: #d14b4b;
          }
          .grand-total {
            border-top: 1px solid #d9e0ea;
            margin-top: 10px;
            padding-top: 10px;
            display: flex;
            justify-content: space-between;
            color: #345a99;
            font-size: 14px;
            font-weight: 800;
          }
          .notes-section {
            margin-top: 18px;
            background: #f8fafc;
            border-top: 1px solid #dbe3ef;
            border-bottom: 1px solid #dbe3ef;
            padding: 14px 12px;
          }
          .notes-title {
            color: #345a99;
            font-size: 12px;
            font-weight: 800;
            margin-bottom: 10px;
          }
          .delivery-chip {
            display: inline-block;
            border: 1px solid #cfd7e4;
            background: #ffffff;
            border-radius: 6px;
            padding: 7px 10px;
            font-size: 10px;
            margin-bottom: 12px;
          }
          .terms-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 24px;
          }
          .term-item {
            font-size: 9.5px;
            line-height: 1.45;
            color: #475569;
          }
          .references-section {
            margin-top: 16px;
          }
          .references-title {
            color: #345a99;
            font-size: 12px;
            font-weight: 800;
            margin-bottom: 10px;
          }
          .reference-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
          }
          .reference-card {
            border: 1px solid #d9e0ea;
            border-radius: 8px;
            overflow: hidden;
            background: #ffffff;
          }
          .reference-image {
            width: 100%;
            height: 78px;
            object-fit: cover;
            background: #eef2f7;
          }
          .reference-fallback {
            display: flex;
            align-items: center;
            justify-content: center;
            color: #345a99;
            font-size: 12px;
            font-weight: 700;
          }
          .reference-caption {
            padding: 6px 8px;
            font-size: 9px;
            color: #64748b;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="top-grid">
            <div class="card logo-card">
              ${
                logoDataUri
                  ? `<img src="${logoDataUri}" alt="logo" />`
                  : `<div class="logo-fallback">WINDOFORM</div>`
              }
            </div>
            <div class="card offer-card">
              <div class="offer-title">FİYAT TEKLİFİ</div>
              <div class="meta-line"><span class="label">Teklif No:</span><span class="value">${escapeHtml(params.offerNo ?? "-")}</span></div>
              <div class="meta-line"><span class="label">Tarih:</span><span class="value">${escapeHtml(formatDate(params.offerDate) || new Date().toLocaleDateString("tr-TR"))}</span></div>
              <div class="meta-line"><span class="label">Teslim:</span><span class="value">${escapeHtml(formatDate(params.deliveryDate) || "-")}</span></div>
            </div>
          </div>

          <div class="info-grid" style="margin-top:12px;">
            <div class="card company-card">
              <div class="card-title">${escapeHtml(COMPANY_NAME)}</div>
              ${COMPANY_CONTACT_LINES.map((line) => `<div class="company-line">${escapeHtml(line)}</div>`).join("")}
            </div>
            <div class="card customer-card">
              <div class="muted-tag">MÜŞTERİ (CARİ)</div>
              ${customerDetailLines
                .map((line, index) =>
                  `<div class="customer-line" style="${index === 0 ? "font-weight:700;color:#345a99;" : ""}">${escapeHtml(line)}</div>`
                )
                .join("")}
            </div>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th class="img-col">GÖRSEL</th>
                  <th class="code-col">STOK KODU</th>
                  <th class="name-col">STOK ADI / AÇIKLAMA</th>
                  <th class="qty-col center">MİKTAR</th>
                  <th class="price-col num">BİRİM FİYAT</th>
                  <th class="discount-col num">İSKONTO</th>
                  <th class="total-col num">NET TOPLAM</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>

          <div class="summary-grid">
            <div class="approval-box">
              <div class="approval-title">MÜŞTERİ ONAYI</div>
              <div class="approval-line"></div>
              <div class="approval-caption">Kaşe ve imza</div>
            </div>
            <div class="total-box">
              <div class="total-row"><span>Brüt Toplam:</span><span>${escapeHtml(formatCurrency(totals.grossTotal, currency.code))}</span></div>
              <div class="total-row discount"><span>İskonto Toplam:</span><span>${escapeHtml(formatCurrency(totals.discountTotal, currency.code))}</span></div>
              <div class="total-row"><span>Net Ara Toplam:</span><span>${escapeHtml(formatCurrency(totals.netTotal, currency.code))}</span></div>
              <div class="total-row"><span>KDV:</span><span>${escapeHtml(formatCurrency(totals.vatTotal, currency.code))}</span></div>
              <div class="grand-total"><span>Genel Toplam:</span><span>${escapeHtml(formatCurrency(totals.grandTotal, currency.code))}</span></div>
            </div>
          </div>

          <div class="notes-section">
            <div class="notes-title">TEKLİF ŞARTLARI VE ÖNEMLİ NOTLAR</div>
            <div class="delivery-chip">TESLİM ŞEKLİ (DELIVERY TERMS): ${escapeHtml(params.salesTypeName || "Belirtilecektir")}</div>
            <div class="terms-grid">
              ${renderedTerms
                .map((line) => `<div class="term-item">• ${escapeHtml(line)}</div>`)
                .join("")}
            </div>
          </div>

          <div class="references-section">
            <div class="references-title">SAHA VE KEŞİF GÖRSELLERİ (REFERANS)</div>
            <div class="reference-grid">${refCardsHtml}</div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function createBuiltInQuotationReportPdf(
  params: CreateBuiltInQuotationReportPdfParams
): Promise<string> {
  const [logoDataUri, ...referenceImages] = await Promise.all([
    readAssetAsDataUri(BRAND_LOGO_ASSET),
    ...REFERENCE_IMAGE_ASSETS.map((asset) => readAssetAsDataUri(asset)),
  ]);

  const html = buildHtml(params, logoDataUri, referenceImages);
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
