import type { TFunction } from "i18next";
import type { PreviewPdfLineDetailLabels } from "./previewPdfLineDetails";

export function buildSalesDocumentPreviewPdfLineDetailLabels(
  t: TFunction
): PreviewPdfLineDetailLabels {
  return {
    descriptionField1Label: t("lines.descriptionField1Label"),
    descriptionField2Label: t("lines.descriptionField2Label"),
    descriptionField3Label: t("lines.descriptionField3Label"),
    windoProfileLabel: t("lines.windoProfileLabel"),
    windoRebarLabel: t("lines.windoRebarLabel"),
    windoScrewLabel: t("lines.windoScrewLabel"),
    windoPrintLabel: t("lines.windoPrintLabel"),
    windoPrintDescriptionLabel: t("lines.windoPrintDescriptionLabel"),
  };
}
