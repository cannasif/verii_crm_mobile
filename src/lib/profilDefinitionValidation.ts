export interface LineWithProfilDefinition {
  profilDefinitionId?: number | null;
}

export function isProfilDefinitionValid(line: LineWithProfilDefinition): boolean {
  return typeof line.profilDefinitionId === "number" && Number.isFinite(line.profilDefinitionId) && line.profilDefinitionId > 0;
}

export function areProfilDefinitionsValid(lines: LineWithProfilDefinition[]): boolean {
  return lines.every(isProfilDefinitionValid);
}
