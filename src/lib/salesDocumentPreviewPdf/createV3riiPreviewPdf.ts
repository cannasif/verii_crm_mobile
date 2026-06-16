import * as Print from "expo-print";
import { attachLineImageDataUris } from "./attachLineImageDataUris";
import {
  computeDocumentTotals,
  getDiscountedUnitPrice,
  hasLineDiscount,
} from "./calculations";
import type { PreviewPdfFooterDetailBlock } from "./buildPreviewPdfFooterDetails";
import {
  buildPreviewPdfLineDetailRows,
  groupPreviewPdfLineDetailRowGroups,
  isShortPreviewPdfLineDetailRow,
} from "./previewPdfLineDetails";
import type {
  SalesDocumentPreviewPdfInput,
  SalesDocumentPreviewPdfLabels,
} from "./types";

const DEFAULT_NOT_SPECIFIED = "—";

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

function buildTableHeader(labels: SalesDocumentPreviewPdfLabels, showImage: boolean, showNetUnit: boolean): string {
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

function buildLineDetailGroupsHtml(input: SalesDocumentPreviewPdfInput, line: SalesDocumentPreviewPdfInput["lines"][number]): string {
  if (!input.lineDetailLabels || !input.lineDetailMaps) return "";

  const detailRows = buildPreviewPdfLineDetailRows(line, input.lineDetailLabels, input.lineDetailMaps);
  if (detailRows.length === 0) return "";

  const groups = groupPreviewPdfLineDetailRowGroups(detailRows);
  return groups
    .map((group) => {
      if (group.length > 1 || (group.length === 1 && isShortPreviewPdfLineDetailRow(group[0]))) {
        const items = group
          .map(
            (row) =>
              `<span class="detail-inline-item"><span class="detail-label">${escapeHtml(row.label)}:</span> ${escapeHtml(row.value)}</span>`
          )
          .join("");
        return `<div class="detail-group detail-group-inline">${items}</div>`;
      }

      const row = group[0];
      return `<div class="detail-group"><div class="detail-block"><span class="detail-label">${escapeHtml(row.label)}:</span> <span class="detail-value">${escapeHtml(row.value)}</span></div></div>`;
    })
    .join("");
}

function buildFooterDetailsLeft(blocks: PreviewPdfFooterDetailBlock[] | undefined): string {
  if (!blocks?.length) return "";

  const content = blocks
    .map(
      (block) => `
        <div class="footer-detail-block">
          <div class="footer-detail-label">${escapeHtml(block.label)}</div>
          <div class="footer-detail-value">${escapeHtml(block.value).replace(/\n/g, "<br/>")}</div>
        </div>
      `
    )
    .join("");

  return `<div class="footer-details-left">${content}</div>`;
}

function buildTableRows(input: SalesDocumentPreviewPdfInput, showImage: boolean, showNetUnit: boolean): string {
  const labels = input.labels ?? { notSpecified: DEFAULT_NOT_SPECIFIED } as SalesDocumentPreviewPdfLabels;
  const notSpecified = labels.notSpecified || DEFAULT_NOT_SPECIFIED;

  return input.lines
    .map((line) => {
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
            : "code-main";
      const imageCell = showImage
        ? `<td class="col-image">
            ${
              line.imageDataUri
                ? `<img src="${line.imageDataUri}" class="line-image" alt="" />`
                : `<div class="line-image-placeholder"></div>`
            }
          </td>`
        : "";
      const detailGroupsHtml = buildLineDetailGroupsHtml(input, line);

      return `
        <tr>
          ${imageCell}
          <td class="product-code-cell ${codeClass}">${escapeHtml(line.productCode ?? notSpecified)}</td>
          <td class="product-name-cell">
            <div class="product-name-main">${escapeHtml(line.productName || notSpecified)}</div>
            ${detailGroupsHtml}
          </td>
          <td class="center">${escapeHtml(quantityText)}</td>
          <td class="num">${escapeHtml(formatMoney(unitPriceValue, input.currencyCode, input.locale))}</td>
          <td class="num">${escapeHtml(formatMoney(line.lineTotal, input.currencyCode, input.locale))}</td>
        </tr>
      `;
    })
    .join("");
}

function buildFooterRows(
  input: SalesDocumentPreviewPdfInput,
  labels: SalesDocumentPreviewPdfLabels
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

function buildHtml(input: SalesDocumentPreviewPdfInput): string {
  const labels = input.labels ?? ({ notSpecified: DEFAULT_NOT_SPECIFIED } as SalesDocumentPreviewPdfLabels);
  const showImage = input.lines.some((line) => !!line.imageDataUri);
  const showNetUnit = hasLineDiscount(input.lines);
  const formattedDate = formatDate(input.offerDate, input.locale, labels.notSpecified);
  const formattedOfferNo = input.offerNo?.trim() || labels.notSpecified;
  const branchCodeLine = input.branchCode
    ? `<div class="card-sub">${escapeHtml(input.branchCode)}</div>`
    : "";
  const footerNoteBlock = labels.footerNote?.trim()
    ? `<div class="footer-note">${escapeHtml(labels.footerNote.trim())}</div>`
    : "";
  const footerDetailsLeft = buildFooterDetailsLeft(input.footerDetails);

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
            padding: 2.5mm 2mm;
            vertical-align: top;
            background: #ffffff;
          }
          tbody tr + tr td {
            border-top: 1px solid rgb(228, 214, 223);
          }
          .center { text-align: center; }
          .num { text-align: right; white-space: nowrap; }
          .product-code-cell {
            font-size: 8.8pt;
            font-weight: 600;
          }
          .code-main { font-size: 8.8pt; }
          .code-medium { font-size: 7.5pt; }
          .code-small { font-size: 6.8pt; }
          .product-name-cell {
            min-width: 42mm;
          }
          .product-name-main {
            font-size: 8.8pt;
            font-weight: 600;
            line-height: 1.25;
            margin-bottom: 0.8mm;
          }
          .detail-group {
            margin-top: 0.6mm;
          }
          .detail-group-inline {
            display: flex;
            flex-wrap: wrap;
            gap: 2mm 3mm;
          }
          .detail-inline-item,
          .detail-block {
            font-size: 6pt;
            line-height: 1.35;
            color: rgb(42, 27, 42);
          }
          .detail-label {
            font-weight: 700;
            color: rgb(60, 22, 54);
          }
          .detail-value {
            word-break: break-word;
          }
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
            justify-content: space-between;
            align-items: flex-start;
            gap: 6mm;
            page-break-inside: avoid;
          }
          .footer-details-left {
            flex: 1;
            max-width: 100mm;
            font-size: 7.5pt;
            line-height: 1.4;
            color: rgb(42, 27, 42);
          }
          .footer-detail-block + .footer-detail-block {
            margin-top: 2.5mm;
          }
          .footer-detail-label {
            font-size: 7pt;
            font-weight: 700;
            text-transform: uppercase;
            color: rgb(60, 22, 54);
            margin-bottom: 0.8mm;
          }
          .footer-detail-value {
            white-space: pre-wrap;
            word-break: break-word;
          }
          .footer-card {
            width: 88mm;
            flex-shrink: 0;
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
          .footer-note {
            margin-top: 5mm;
            font-size: 7.5pt;
            color: rgb(120, 102, 116);
            text-align: center;
            line-height: 1.4;
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
            ${footerDetailsLeft}
            ${buildFooterRows(input, labels)}
          </div>
          ${footerNoteBlock}
        </div>
      </body>
    </html>
  `;
}

export async function createV3riiSalesDocumentPreviewPdf(
  input: SalesDocumentPreviewPdfInput
): Promise<string> {
  if (!input.lines.length) {
    throw new Error("SALES_DOCUMENT_PDF_NO_LINES");
  }

  const linesWithImages = await attachLineImageDataUris(input.lines);
  const html = buildHtml({ ...input, lines: linesWithImages });
  const generated = await Print.printToFileAsync({ html });
  const generatedUri = generated.uri.startsWith("file://")
    ? generated.uri
    : `file://${generated.uri}`;
  return generatedUri;
}
