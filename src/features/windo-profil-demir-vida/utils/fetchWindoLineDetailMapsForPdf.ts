import { fetchWindoDefinitionCatalog } from "../api/windoDefinitionApi";
import type { PreviewPdfLineDetailMaps } from "../../../lib/salesDocumentPreviewPdf";
import type { WindoDefinitionDto } from "../types";

function toMap(items: WindoDefinitionDto[]): Record<number, string> {
  const map: Record<number, string> = {};
  for (const item of items) {
    if (item.id > 0 && item.name?.trim()) {
      map[item.id] = item.name.trim();
    }
  }
  return map;
}

export async function fetchWindoLineDetailMapsForPdf(): Promise<PreviewPdfLineDetailMaps> {
  const catalog = await fetchWindoDefinitionCatalog();
  return {
    profilMap: toMap(catalog.profilDefinitions),
    demirMap: toMap(catalog.demirDefinitions),
    vidaMap: toMap(catalog.vidaDefinitions),
    baskiMap: toMap(catalog.baskiDefinitions),
  };
}
