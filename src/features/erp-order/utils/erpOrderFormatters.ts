export function formatErpOrderAmount(
  value: number | null | undefined,
  locale: string
): string {
  if (value == null || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatErpOrderText(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "-";
}
