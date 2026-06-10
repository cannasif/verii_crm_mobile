import * as Print from "expo-print";
import {
  computeDocumentTotals,
  getDiscountedUnitPrice,
  hasLineDiscount,
} from "./quotationPreviewPdfCalculations";
import { attachLineImageDataUris } from "./fetchQuotationLineImageDataUris";
import {
  QUOTATION_PREVIEW_PDF_LABELS_TR,
  type QuotationPreviewPdfInput,
  type QuotationPreviewPdfLabels,
} from "./quotationPreviewPdf.types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value: string | null | undefined, locale: string, notSpecified: string): string {
  if (!value?.trim()) return notSpecified;
  const normalized = value.includes("T") ? value.split("T")[0] : value;
  const date = new Date(`${normalized}T12:00:00`);
  if (Number.isNaN(date.getTime())) return normalized;
  return date.toLocaleDateString(locale);
}

function formatMoney(value: number, currencyCode: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode || "TRY",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0);
  } catch {
    return `${(value || 0).toFixed(2)} ${currencyCode || "TRY"}`;
  }
}

function buildTableHeader(labels: QuotationPreviewPdfLabels, showImage: boolean, showNetUnit: boolean): string {
  const unitLabel = showNetUnit ? labels.unitPriceNet : labels.unitPrice;
  const imageCol = showImage
    ? `<th class="col-image">${escapeHtml(labels.lineImage)}</th>`
    : "";

  return `
    <thead>
      <tr>
        ${imageCol}
        <th>${escapeHtml(labels.productCode)}</th>
        <th>${escapeHtml(labels.productName)}</th>
        <th class="center">${escapeHtml(labels.quantity)}</th>
        <th class="num">${escapeHtml(unitLabel)}</th>
        <th class="num">${escapeHtml(labels.lineTotal)}</th>
      </tr>
    </thead>
  `;
}

function buildTableRows(input: QuotationPreviewPdfInput, showImage: boolean, showNetUnit: boolean): string {
  const labels = input.labels ?? QUOTATION_PREVIEW_PDF_LABELS_TR;

  return input.lines
    .map((line, index) => {
      const quantityText = line.unit?.trim()
        ? `${line.quantity} ${line.unit.trim()}`
        : String(line.quantity ?? 0);
      const unitPriceValue = showNetUnit
        ? getDiscountedUnitPrice(
            line.unitPrice,
            line.discountRate1,
            line.discountRate2,
            line.discountRate3
          )
        : line.unitPrice;
      const codeClass =
        (line.productCode?.length ?? 0) > 22
          ? "code-small"
          : (line.productCode?.length ?? 0) > 16
            ? "code-medium"
            : "";
      const imageCell = showImage
        ? `<td class="col-image">
            ${
              line.imageDataUri
                ? `<img src="${line.imageDataUri}" class="line-image" alt="" />`
                : `<div class="line-image-placeholder"></div>`
            }
          </td>`
        : "";

      return `
        <tr class="${index % 2 === 1 ? "row-alt" : ""}">
          ${imageCell}
          <td class="${codeClass}">${escapeHtml(line.productCode ?? labels.notSpecified)}</td>
          <td>${escapeHtml(line.productName || labels.notSpecified)}</td>
          <td class="center">${escapeHtml(quantityText)}</td>
          <td class="num">${escapeHtml(formatMoney(unitPriceValue, input.currencyCode, input.locale))}</td>
          <td class="num">${escapeHtml(formatMoney(line.lineTotal, input.currencyCode, input.locale))}</td>
        </tr>
      `;
    })
    .join("");
}

function buildFooterRows(
  input: QuotationPreviewPdfInput,
  labels: QuotationPreviewPdfLabels
): string {
  const totals = computeDocumentTotals(
    input.lines,
    input.generalDiscountRate,
    input.generalDiscountAmount
  );

  const generalDiscountRow =
    totals.generalDiscount > 0
      ? `
        <div class="footer-row discount-row">
          <span>${escapeHtml(labels.generalDiscount)}</span>
          <span>${escapeHtml(formatMoney(-totals.generalDiscount, input.currencyCode, input.locale))}</span>
        </div>
      `
      : "";

  return `
    <div class="footer-card">
      <div class="footer-card-head">${escapeHtml(labels.priceDetail.toUpperCase())}</div>
      <div class="footer-card-body">
        <div class="footer-row">
          <span>${escapeHtml(labels.grossTotal)}</span>
          <span>${escapeHtml(formatMoney(totals.netTotal, input.currencyCode, input.locale))}</span>
        </div>
        ${generalDiscountRow}
        <div class="footer-row">
          <span>${escapeHtml(labels.netSubtotal)}</span>
          <span>${escapeHtml(formatMoney(totals.discountedNetTotal, input.currencyCode, input.locale))}</span>
        </div>
        <div class="footer-row">
          <span>${escapeHtml(labels.totalVat)}</span>
          <span>${escapeHtml(formatMoney(totals.totalVat, input.currencyCode, input.locale))}</span>
        </div>
        <div class="footer-grand">
          <span>${escapeHtml(labels.grandTotalWithVat)}</span>
          <span>${escapeHtml(formatMoney(totals.grandTotal, input.currencyCode, input.locale))}</span>
        </div>
      </div>
    </div>
  `;
}

function buildHtml(input: QuotationPreviewPdfInput): string {
  const labels = input.labels ?? QUOTATION_PREVIEW_PDF_LABELS_TR;
  const showImage = input.lines.some((line) => !!line.imageDataUri);
  const showNetUnit = hasLineDiscount(input.lines);
  const formattedDate = formatDate(input.offerDate, input.locale, labels.notSpecified);
  const formattedOfferNo = input.offerNo?.trim() || labels.notSpecified;
  const branchCodeLine = input.branchCode
    ? `<div class="card-sub">${escapeHtml(input.branchCode)}</div>`
    : "";

  const watermark = input.draft
    ? `<div class="watermark">${escapeHtml(labels.draftWatermark)}</div>`
    : "";

  return `
    <!doctype html>
    <html lang="tr">
      <head>
        <meta charset="utf-8" />
        <style>
          @page {
            size: A4 portrait;
            margin: 14mm;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            color: rgb(42, 27, 42);
            background: #ffffff;
            font-size: 8pt;
          }
          .page {
            position: relative;
            width: 100%;
          }
          .gradient-bar {
            height: 3.2mm;
            border-radius: 1.5mm;
            background: linear-gradient(90deg, rgb(229, 17, 125), rgb(255, 140, 28), rgb(255, 172, 36));
            margin-bottom: 5mm;
          }
          .title-wrap {
            text-align: center;
            margin-bottom: 6mm;
          }
          .title {
            font-size: 23pt;
            font-weight: 700;
            color: rgb(60, 22, 54);
            letter-spacing: 0.5px;
            margin: 0;
          }
          .title-underline {
            width: 36mm;
            height: 1.2mm;
            margin: 2mm auto 0;
            border-radius: 999px;
            background: linear-gradient(90deg, rgb(229, 17, 125), rgb(255, 172, 36));
          }
          .header-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6mm;
            margin-bottom: 6mm;
          }
          .header-card {
            position: relative;
            min-height: 32mm;
            border: 1px solid rgb(228, 214, 223);
            border-radius: 2.5mm;
            padding: 4mm 4mm 4mm 5mm;
            overflow: hidden;
          }
          .header-card.left::before,
          .header-card.right::before {
            content: "";
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 2.2mm;
          }
          .header-card.left::before { background: rgb(229, 17, 125); }
          .header-card.right::before { background: rgb(255, 140, 28); }
          .card-label {
            font-size: 7pt;
            font-weight: 700;
            text-transform: uppercase;
            color: rgb(120, 102, 116);
            margin-bottom: 2mm;
          }
          .card-main {
            font-size: 12pt;
            font-weight: 700;
            color: rgb(42, 27, 42);
            line-height: 1.25;
          }
          .card-sub {
            margin-top: 1mm;
            font-size: 8pt;
            color: rgb(120, 102, 116);
          }
          .meta-divider {
            height: 1px;
            background: rgb(228, 214, 223);
            margin: 3mm 0;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            gap: 4mm;
            font-size: 7.5pt;
            margin-bottom: 1.5mm;
          }
          .meta-label {
            font-weight: 700;
            text-transform: uppercase;
            color: rgb(120, 102, 116);
          }
          .meta-value {
            font-weight: 700;
            color: rgb(42, 27, 42);
          }
          .table-wrap {
            border: 1px solid rgb(228, 214, 223);
            border-radius: 2.5mm;
            overflow: hidden;
            margin-bottom: 6mm;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          thead th {
            background: rgb(60, 22, 54);
            color: #ffffff;
            font-size: 7.5pt;
            font-weight: 700;
            padding: 2.5mm 2mm;
            text-align: left;
          }
          tbody td {
            padding: 2.2mm 2mm;
            vertical-align: top;
          }
          tbody tr + tr td {
            border-top: 1px solid rgb(228, 214, 223);
          }
          tbody tr.row-alt { background: rgb(252, 247, 250); }
          .center { text-align: center; }
          .num { text-align: right; white-space: nowrap; }
          .code-medium { font-size: 7pt; }
          .code-small { font-size: 6pt; }
          .col-image { width: 16mm; text-align: center; }
          .line-image {
            width: 12mm;
            height: 12mm;
            object-fit: cover;
            border-radius: 1.5mm;
            border: 1px solid rgb(228, 214, 223);
          }
          .line-image-placeholder {
            width: 12mm;
            height: 12mm;
            border-radius: 1.5mm;
            border: 1px dashed rgb(228, 214, 223);
            margin: 0 auto;
          }
          .footer-wrap {
            display: flex;
            justify-content: flex-end;
            page-break-inside: avoid;
          }
          .footer-card {
            width: 88mm;
            border: 1px solid rgb(228, 214, 223);
            border-radius: 2.5mm;
            overflow: hidden;
          }
          .footer-card-head {
            background: rgb(252, 235, 242);
            padding: 2.5mm 3mm;
            font-size: 7pt;
            font-weight: 700;
            color: rgb(60, 22, 54);
          }
          .footer-card-body {
            padding: 2mm 3mm 3mm;
          }
          .footer-row {
            display: flex;
            justify-content: space-between;
            gap: 4mm;
            padding: 1.4mm 0;
            font-size: 8pt;
            color: rgb(42, 27, 42);
          }
          .discount-row span:last-child {
            color: rgb(229, 17, 125);
            font-weight: 700;
          }
          .footer-grand {
            margin-top: 2mm;
            padding: 2.5mm 3mm;
            border-radius: 2mm;
            background: linear-gradient(90deg, rgb(229, 17, 125), rgb(255, 140, 28), rgb(255, 172, 36));
            color: #ffffff;
            display: flex;
            justify-content: space-between;
            gap: 4mm;
            font-size: 8pt;
            font-weight: 700;
          }
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 104pt;
            font-weight: 700;
            color: rgba(229, 17, 125, 0.05);
            z-index: 10;
            pointer-events: none;
          }
        </style>
      </head>
      <body>
        ${watermark}
        <div class="page">
          <div class="gradient-bar"></div>
          <div class="title-wrap">
            <h1 class="title">${escapeHtml(labels.documentTitle)}</h1>
            <div class="title-underline"></div>
          </div>

          <div class="header-grid">
            <div class="header-card left">
              <div class="card-label">${escapeHtml(labels.senderLabel)}</div>
              <div class="card-main">${escapeHtml(input.branchName)}</div>
              ${branchCodeLine}
            </div>
            <div class="header-card right">
              <div class="card-label">${escapeHtml(labels.recipientLabel)}</div>
              <div class="card-main">${escapeHtml(input.customerName)}</div>
              <div class="meta-divider"></div>
              <div class="meta-row">
                <span class="meta-label">${escapeHtml(labels.metaDate)}</span>
                <span class="meta-value">${escapeHtml(formattedDate)}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">${escapeHtml(labels.metaOfferNo)}</span>
                <span class="meta-value">${escapeHtml(formattedOfferNo)}</span>
              </div>
            </div>
          </div>

          <div class="table-wrap">
            <table>
              ${buildTableHeader(labels, showImage, showNetUnit)}
              <tbody>
                ${buildTableRows(input, showImage, showNetUnit)}
              </tbody>
            </table>
          </div>

          <div class="footer-wrap">
            ${buildFooterRows(input, labels)}
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function createV3riiQuotationPreviewPdf(
  input: QuotationPreviewPdfInput
): Promise<string> {
  if (!input.lines.length) {
    throw new Error("En az bir satır gerekli");
  }

  const linesWithImages = await attachLineImageDataUris(input.lines);
  const html = buildHtml({ ...input, lines: linesWithImages });
  const generated = await Print.printToFileAsync({ html });
  const generatedUri = generated.uri.startsWith("file://")
    ? generated.uri
    : `file://${generated.uri}`;
  return generatedUri;
}
