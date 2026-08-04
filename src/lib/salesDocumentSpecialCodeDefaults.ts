const AUTO_SPECIAL_CODE_DEFAULTS = new Set(["N", "K", "I"]);

export const EXPORT_REGISTERED_DELIVERY_SALES_TYPE_CODE = "5";

export function getDefaultSpecialCodeForOfferType(
  offerType?: string | null,
  deliveryMethodSalesTypeCode?: string | null
): string | null {
  const normalizedOfferType = String(offerType ?? "").trim().toUpperCase();

  if (normalizedOfferType === "YURTICI" || normalizedOfferType === "DOMESTIC") return "N";
  if (normalizedOfferType === "YURTDISI" || normalizedOfferType === "EXPORT") {
    return String(deliveryMethodSalesTypeCode ?? "").trim() ===
      EXPORT_REGISTERED_DELIVERY_SALES_TYPE_CODE
      ? "K"
      : "I";
  }

  return null;
}

export function deriveSpecialCode2FromSpecialCode1(value?: string | null): string {
  const firstCharacter = String(value ?? "").trim().charAt(0).toUpperCase();
  return AUTO_SPECIAL_CODE_DEFAULTS.has(firstCharacter) ? firstCharacter : "";
}

export function canApplySpecialCodeDefault(value?: string | null): boolean {
  const normalizedValue = String(value ?? "").trim().toUpperCase();

  return normalizedValue.length === 0 || AUTO_SPECIAL_CODE_DEFAULTS.has(normalizedValue);
}

export function hasSpecialCodeOption(
  options: Array<{ ozelKod?: string | null }>,
  specialCode?: string | null
): boolean {
  const normalizedSpecialCode = String(specialCode ?? "").trim();

  if (!normalizedSpecialCode) return false;

  return options.some((option) => option.ozelKod?.trim() === normalizedSpecialCode);
}
