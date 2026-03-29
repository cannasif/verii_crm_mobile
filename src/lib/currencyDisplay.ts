/**
 * ERP / API bazen para birimini ISO kodu yerine enum (0,1,2,3) veya kısaltma ile döner.
 * Intl ve liste etiketleri için normalize eder.
 */

export function resolveCurrencyIsoCode(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined || raw === "") return "TRY";

  if (typeof raw === "number" && Number.isFinite(raw)) {
    switch (raw) {
      case 0:
        return "TRY";
      case 1:
        return "USD";
      case 2:
        return "EUR";
      case 3:
        return "GBP";
      default:
        return "TRY";
    }
  }

  const v = String(raw).trim().toUpperCase();
  switch (v) {
    case "0":
    case "TL":
    case "TRY":
      return "TRY";
    case "1":
    case "USD":
      return "USD";
    case "2":
    case "EUR":
    case "EURO":
      return "EUR";
    case "3":
    case "GBP":
    case "STERLIN":
      return "GBP";
    case "DOLAR":
    case "DOLLAR":
      return "USD";
    default:
      if (/^[A-Z]{3}$/.test(v)) return v;
      return "TRY";
  }
}

/** Liste / özet satırlarında gösterim (hızlı teklif ekranlarıyla aynı isimlendirme). */
export function getCurrencyDisplayLabel(raw: string | number | null | undefined): string {
  const value = String(raw ?? "").trim().toUpperCase();

  if (typeof raw === "number" && Number.isFinite(raw)) {
    switch (raw) {
      case 0:
        return "TL";
      case 1:
        return "USD";
      case 2:
        return "EURO";
      case 3:
        return "STERLIN";
      default:
        return String(raw);
    }
  }

  switch (value) {
    case "0":
    case "TL":
    case "TRY":
      return "TL";
    case "1":
    case "USD":
      return "USD";
    case "2":
    case "EUR":
    case "EURO":
      return "EURO";
    case "3":
    case "GBP":
    case "STERLIN":
      return "STERLIN";
    case "DOLAR":
    case "DOLLAR":
      return "USD";
    default:
      return value || "-";
  }
}

const CURRENCY_SYMBOL_FALLBACK: Record<string, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

/**
 * Para birimi simgesi. tr-TR ile Intl bazen "Dolar" gibi kelime döndürür; bilinen ISO için sabit sembol kullanılır.
 */
export function getCurrencySymbol(raw: string | number | null | undefined): string {
  const iso = resolveCurrencyIsoCode(raw);
  const known = CURRENCY_SYMBOL_FALLBACK[iso];
  if (known) return known;

  try {
    const parts = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: iso,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);
    const sym = parts.find((p) => p.type === "currency")?.value;
    if (sym) return sym;
  } catch {
    // ignore
  }
  return iso;
}
