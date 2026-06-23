import type { SpecialCodeDto } from "../types/specialCode";

export function formatSpecialCodeOptionName(item: SpecialCodeDto): string {
  const displayName = item.displayName?.trim();
  if (displayName) return displayName;

  const description = item.aciklama?.trim();
  return description ? `${item.ozelKod} - ${description}` : item.ozelKod;
}

export function resolveSpecialCodeLabel(
  value: string | null | undefined,
  items: SpecialCodeDto[],
  fallback: string
): string {
  if (!value) return fallback;

  const match = items.find((item) => item.ozelKod === value);
  return match ? formatSpecialCodeOptionName(match) : value;
}
