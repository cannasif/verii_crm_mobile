import type { WindoDefinitionDto } from "../types";

function readNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

export function normalizeWindoDefinitionDto(raw: unknown): WindoDefinitionDto | null {
  if (!raw || typeof raw !== "object") return null;

  const source = raw as Record<string, unknown>;
  const id = readNumber(source.id ?? source.Id);
  if (id == null) return null;

  const profilDefinitionId = readNumber(source.profilDefinitionId ?? source.ProfilDefinitionId);

  return {
    id,
    name: readString(source.name ?? source.Name),
    code: (source.code ?? source.Code ?? null) as string | null | undefined,
    description: (source.description ?? source.Description ?? null) as string | null | undefined,
    isActive: (source.isActive ?? source.IsActive) as boolean | undefined,
    profilDefinitionId,
    profilDefinitionName: readString(source.profilDefinitionName ?? source.ProfilDefinitionName) || null,
  };
}

export function normalizeWindoDefinitionList(raw: unknown): WindoDefinitionDto[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => normalizeWindoDefinitionDto(item))
    .filter((item): item is WindoDefinitionDto => item != null && item.name.trim().length > 0);
}
