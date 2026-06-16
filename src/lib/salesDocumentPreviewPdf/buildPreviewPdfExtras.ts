import type { TFunction } from "i18next";
import { buildPreviewPdfDocumentFooterDetails } from "./buildPreviewPdfFooterDetails";
import { buildSalesDocumentPreviewPdfLineDetailLabels } from "./buildPreviewPdfLabels";
import type { PreviewPdfFooterDetailBlock } from "./buildPreviewPdfFooterDetails";
import type { PreviewPdfLineDetailLabels, PreviewPdfLineDetailMaps } from "./previewPdfLineDetails";

export interface BuildSalesDocumentPreviewPdfExtrasParams {
  t: TFunction;
  koliBaskiDefinitionId?: number | null;
  koliBaskiDefinitionName?: string | null;
  koliBaskiMap?: Record<number, string>;
  description?: string | null;
  structuredNotes?: string[];
  lineDetailMaps?: PreviewPdfLineDetailMaps;
}

export interface SalesDocumentPreviewPdfExtras {
  footerDetails: PreviewPdfFooterDetailBlock[];
  lineDetailLabels?: PreviewPdfLineDetailLabels;
  lineDetailMaps?: PreviewPdfLineDetailMaps;
}

export function buildSalesDocumentPreviewPdfExtras(
  params: BuildSalesDocumentPreviewPdfExtrasParams
): SalesDocumentPreviewPdfExtras {
  const koliBaskiName =
    params.koliBaskiDefinitionName?.trim() ||
    (params.koliBaskiDefinitionId != null &&
    params.koliBaskiDefinitionId > 0 &&
    params.koliBaskiMap
      ? params.koliBaskiMap[params.koliBaskiDefinitionId]?.trim()
      : null) ||
    null;

  const footerDetails = buildPreviewPdfDocumentFooterDetails(
    {
      koliBaskiName,
      description: params.description,
      structuredNotes: params.structuredNotes,
    },
    {
      koliBaskiLabel: params.t("header.koliBaski"),
      notesLabel: params.t("header.notes"),
    }
  );

  if (!params.lineDetailMaps) {
    return { footerDetails };
  }

  return {
    footerDetails,
    lineDetailLabels: buildSalesDocumentPreviewPdfLineDetailLabels(params.t),
    lineDetailMaps: params.lineDetailMaps,
  };
}
