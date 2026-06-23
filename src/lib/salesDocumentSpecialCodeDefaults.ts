const AUTO_SPECIAL_CODE_DEFAULTS = new Set(["N", "K"]);

export function getDefaultSpecialCodeForOfferType(offerType?: string | null): string | null {
  const normalizedOfferType = String(offerType ?? "").trim().toUpperCase();

  if (normalizedOfferType === "YURTICI" || normalizedOfferType === "DOMESTIC") return "N";
  if (normalizedOfferType === "YURTDISI" || normalizedOfferType === "EXPORT") return "K";

  return null;
}

export function canApplySpecialCodeDefault(value?: string | null): boolean {
  const normalizedValue = String(value ?? "").trim().toUpperCase();

  return normalizedValue.length === 0 || AUTO_SPECIAL_CODE_DEFAULTS.has(normalizedValue);
}
