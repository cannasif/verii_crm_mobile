export interface PreviewPdfFooterDetailBlock {
  label: string;
  value: string;
}

export interface PreviewPdfFooterDetailsInput {
  koliBaskiName?: string | null;
  description?: string | null;
  structuredNotes?: string[];
}

export interface PreviewPdfFooterDetailsLabels {
  koliBaskiLabel: string;
  notesLabel: string;
}

export function buildPreviewPdfDocumentFooterDetails(
  input: PreviewPdfFooterDetailsInput,
  labels: PreviewPdfFooterDetailsLabels
): PreviewPdfFooterDetailBlock[] {
  const blocks: PreviewPdfFooterDetailBlock[] = [];

  const koliBaskiName = input.koliBaskiName?.trim();
  if (koliBaskiName) {
    blocks.push({ label: labels.koliBaskiLabel, value: koliBaskiName });
  }

  const noteParts: string[] = [];
  const description = input.description?.trim();
  if (description) {
    noteParts.push(description);
  }
  for (const note of input.structuredNotes ?? []) {
    const trimmed = note?.trim();
    if (trimmed) {
      noteParts.push(trimmed);
    }
  }

  const notesText = noteParts.join("\n\n");
  if (notesText) {
    blocks.push({ label: labels.notesLabel, value: notesText });
  }

  return blocks;
}
