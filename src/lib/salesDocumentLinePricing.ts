export interface SalesDocumentCurrencyOption {
  code: string;
  dovizTipi: number;
}

export interface SalesDocumentExchangeRate {
  dovizTipi: number;
  kurDegeri: number;
}

export interface SalesDocumentPricingRuleLike {
  stokCode: string;
  minQuantity?: number | null;
  maxQuantity?: number | null;
}

export interface SalesDocumentDiscountLimitLike {
  erpProductGroupCode: string;
}

export function normalizeSalesDocumentCurrencyCode(value?: string | null): string {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized === "TL" || normalized === "TRY" ? "TRY" : normalized;
}

export function convertSalesDocumentLinePrice(
  amount: number,
  sourceCurrency: string,
  targetCurrency: string,
  currencyOptions?: SalesDocumentCurrencyOption[],
  exchangeRates?: SalesDocumentExchangeRate[]
): number {
  const safeAmount = Number(amount) || 0;
  const source = normalizeSalesDocumentCurrencyCode(sourceCurrency || "TRY");
  const target = normalizeSalesDocumentCurrencyCode(targetCurrency || "TRY");

  if (safeAmount <= 0 || source === target) return safeAmount;

  const resolveRate = (currencyCode: string): number | null => {
    if (currencyCode === "TRY") return 1;
    const option = currencyOptions?.find(
      (item) => normalizeSalesDocumentCurrencyCode(item.code) === currencyCode
    );
    if (!option) return null;
    const rate = exchangeRates?.find((item) => item.dovizTipi === option.dovizTipi)?.kurDegeri;
    return rate != null && rate > 0 ? rate : null;
  };

  const sourceRate = resolveRate(source);
  const targetRate = resolveRate(target);
  if (sourceRate == null || targetRate == null || targetRate <= 0) return safeAmount;

  return (safeAmount * sourceRate) / targetRate;
}

export function findMatchingSalesDocumentPricingRule<T extends SalesDocumentPricingRuleLike>(
  rules: T[] | undefined,
  productCode: string | null | undefined,
  quantity: number
): T | undefined {
  const normalizedProductCode = String(productCode ?? "").trim().toUpperCase();
  if (!normalizedProductCode || !rules?.length) return undefined;

  return rules
    .filter((rule) => String(rule.stokCode ?? "").trim().toUpperCase() === normalizedProductCode)
    .filter((rule) => {
      const minimum = rule.minQuantity ?? 0;
      const maximum = rule.maxQuantity ?? Number.POSITIVE_INFINITY;
      return quantity >= minimum && quantity <= maximum;
    })
    .sort((left, right) => (right.minQuantity ?? 0) - (left.minQuantity ?? 0))[0];
}

function normalizeProductGroupCode(value?: string | null): string {
  return String(value ?? "").trim().toUpperCase();
}

function productGroupRoot(value?: string | null): string {
  const normalized = normalizeProductGroupCode(value);
  return normalized.split("/")[0] ?? normalized;
}

export function findMatchingSalesDocumentDiscountLimit<T extends SalesDocumentDiscountLimitLike>(
  limits: T[] | undefined,
  productGroupCode?: string | null
): T | undefined {
  const normalizedGroup = normalizeProductGroupCode(productGroupCode);
  if (!normalizedGroup || !limits?.length) return undefined;

  return limits.find((limit) => {
    const normalizedLimit = normalizeProductGroupCode(limit.erpProductGroupCode);
    return (
      normalizedLimit === normalizedGroup ||
      (!!normalizedLimit && productGroupRoot(normalizedLimit) === productGroupRoot(normalizedGroup))
    );
  });
}
