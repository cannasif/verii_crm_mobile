export interface PreviewPdfLineDetailRow {
  label: string;
  value: string;
}

export function isShortPreviewPdfLineDetailRow(row: PreviewPdfLineDetailRow): boolean {
  return row.value.length <= 16 && `${row.label}: ${row.value}`.length <= 34;
}

export function groupPreviewPdfLineDetailRowGroups(
  rows: PreviewPdfLineDetailRow[]
): PreviewPdfLineDetailRow[][] {
  const groups: PreviewPdfLineDetailRow[][] = [];
  let buffer: PreviewPdfLineDetailRow[] = [];

  const flushBuffer = (): void => {
    if (buffer.length > 0) {
      groups.push(buffer);
      buffer = [];
    }
  };

  for (const row of rows) {
    if (isShortPreviewPdfLineDetailRow(row)) {
      buffer.push(row);
      if (buffer.length === 3) {
        flushBuffer();
      }
      continue;
    }

    flushBuffer();
    groups.push([row]);
  }

  flushBuffer();
  return groups;
}

export interface PreviewPdfLineDetailSource {
  description1?: string | null;
  description2?: string | null;
  description3?: string | null;
  profilDefinitionId?: number | null;
  demirDefinitionId?: number | null;
  vidaDefinitionId?: number | null;
  vidaDefinitionName?: string | null;
  baskiDefinitionId?: number | null;
  baskiDefinitionName?: string | null;
  baskiAciklama?: string | null;
}

export interface PreviewPdfLineDetailLabels {
  descriptionField1Label: string;
  descriptionField2Label: string;
  descriptionField3Label: string;
  windoProfileLabel: string;
  windoRebarLabel: string;
  windoScrewLabel: string;
  windoPrintLabel: string;
  windoPrintDescriptionLabel: string;
}

export interface PreviewPdfLineDetailMaps {
  profilMap: Record<number, string>;
  demirMap: Record<number, string>;
  vidaMap: Record<number, string>;
  baskiMap: Record<number, string>;
}

function resolveDefinitionName(
  explicitName: string | null | undefined,
  definitionId: number | null | undefined,
  map: Record<number, string>
): string | null {
  const explicit = explicitName?.trim();
  if (explicit) return explicit;
  if (definitionId != null && definitionId > 0) {
    const fromMap = map[definitionId]?.trim();
    if (fromMap) return fromMap;
  }
  return null;
}

function pushTextDetail(
  rows: PreviewPdfLineDetailRow[],
  label: string,
  value: string | null | undefined
): void {
  const trimmed = value?.trim();
  if (trimmed) {
    rows.push({ label, value: trimmed });
  }
}

export function buildPreviewPdfLineDetailRows(
  line: PreviewPdfLineDetailSource,
  labels: PreviewPdfLineDetailLabels,
  maps: PreviewPdfLineDetailMaps
): PreviewPdfLineDetailRow[] {
  const rows: PreviewPdfLineDetailRow[] = [];

  pushTextDetail(rows, labels.descriptionField1Label, line.description1);
  pushTextDetail(rows, labels.descriptionField2Label, line.description2);
  pushTextDetail(rows, labels.descriptionField3Label, line.description3);

  const profilName = resolveDefinitionName(null, line.profilDefinitionId, maps.profilMap);
  pushTextDetail(rows, labels.windoProfileLabel, profilName);

  const demirName = resolveDefinitionName(null, line.demirDefinitionId, maps.demirMap);
  pushTextDetail(rows, labels.windoRebarLabel, demirName);

  const vidaName = resolveDefinitionName(line.vidaDefinitionName, line.vidaDefinitionId, maps.vidaMap);
  pushTextDetail(rows, labels.windoScrewLabel, vidaName);

  const baskiName = resolveDefinitionName(line.baskiDefinitionName, line.baskiDefinitionId, maps.baskiMap);
  pushTextDetail(rows, labels.windoPrintLabel, baskiName);

  pushTextDetail(rows, labels.windoPrintDescriptionLabel, line.baskiAciklama);

  return rows;
}
