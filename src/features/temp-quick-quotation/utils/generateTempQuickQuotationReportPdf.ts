import { Buffer } from "buffer";
import * as FileSystem from "expo-file-system/legacy";
import { quotationApi } from "../../quotation/api/quotation-api";
import { DocumentRuleType } from "../../quotation/types/quotation-types";

interface GenerateTempQuickQuotationReportPdfParams {
  tempQuotationId?: number;
  templateId?: number;
}

function arrayBufferToBase64(ab: ArrayBuffer): string {
  return Buffer.from(new Uint8Array(ab)).toString("base64");
}

export async function generateTempQuickQuotationReportPdf({
  tempQuotationId,
  templateId,
}: GenerateTempQuickQuotationReportPdfParams): Promise<string> {
  if (tempQuotationId == null || tempQuotationId < 1) {
    throw new Error("Tasarım şablonundan PDF oluşturmak için önce hızlı teklifi kaydedin.");
  }

  const templates = await quotationApi.getReportTemplates();
  const availableTemplates = templates.filter(
    (template) => template.ruleType === DocumentRuleType.FastQuotation && template.isActive
  );

  if (availableTemplates.length === 0) {
    throw new Error("Hızlı teklif için rapor şablonu bulunamadı.");
  }

  const selectedTemplate =
    (templateId != null
      ? availableTemplates.find((template) => template.id === templateId)
      : undefined) ??
    availableTemplates.find((template) => template.default === true) ??
    availableTemplates[0];

  const arrayBuffer = await quotationApi.generateReportPdf({
    templateId: selectedTemplate.id,
    entityId: tempQuotationId,
  });

  const base64 = arrayBufferToBase64(arrayBuffer);
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (dir == null) {
    throw new Error("PDF kaydedilemedi.");
  }

  const fileUri = `${dir}fast-quotation-${tempQuotationId}-${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return fileUri.startsWith("file://") ? fileUri : `file://${fileUri}`;
}
