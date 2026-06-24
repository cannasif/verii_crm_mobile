type ExchangeRateFormLike = {
  id?: string;
  currency: string;
  exchangeRate: number;
  exchangeRateDate?: string;
  isOfficial?: boolean;
  dovizTipi?: number;
};

type ExchangeRateLike = {
  dovizTipi: number;
  dovizIsmi: string | null;
  kurDegeri: number;
};

type CurrencyOptionLike = {
  code: string;
  dovizTipi: number;
  dovizIsmi: string | null;
};

export type ExchangeRatePayloadLike = {
  id: string;
  currency: string;
  exchangeRate: number;
  exchangeRateDate: string;
  isOfficial?: boolean;
  dovizTipi?: number;
};

function normalizeCurrencyValue(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

function resolveCurrencyAliases(value: string): string[] {
  const normalized = normalizeCurrencyValue(value);
  if (!normalized) return [];

  const aliases = new Set<string>([normalized]);

  switch (normalized) {
    case "TL":
    case "TRY":
    case "TURK LIRASI":
    case "TÜRK LİRASI":
      aliases.add("TL");
      aliases.add("TRY");
      aliases.add("TURK LIRASI");
      aliases.add("TÜRK LİRASI");
      break;
    case "USD":
    case "DOLAR":
    case "AMERIKAN DOLARI":
    case "AMERİKAN DOLARI":
    case "ABD DOLARI":
      aliases.add("USD");
      aliases.add("DOLAR");
      aliases.add("AMERIKAN DOLARI");
      aliases.add("AMERİKAN DOLARI");
      aliases.add("ABD DOLARI");
      break;
    case "EUR":
    case "EURO":
      aliases.add("EUR");
      aliases.add("EURO");
      break;
    case "GBP":
    case "STERLIN":
    case "STERLİN":
    case "İNGILIZ STERLINI":
    case "İNGİLİZ STERLİNİ":
    case "INGILIZ STERLINI":
    case "İNGILIZ STERLINI":
      aliases.add("GBP");
      aliases.add("STERLIN");
      aliases.add("STERLİN");
      aliases.add("INGILIZ STERLINI");
      aliases.add("İNGILIZ STERLINI");
      aliases.add("İNGİLİZ STERLİNİ");
      break;
    default:
      break;
  }

  return Array.from(aliases);
}

export function findCurrencyOptionByValue(
  currency: string,
  currencyOptions?: CurrencyOptionLike[]
): CurrencyOptionLike | undefined {
  const aliases = resolveCurrencyAliases(currency);
  if (aliases.length === 0) return undefined;

  return currencyOptions?.find((option) => {
    const optionCode = normalizeCurrencyValue(option.code);
    const optionName = normalizeCurrencyValue(option.dovizIsmi);
    return aliases.includes(optionCode) || aliases.includes(optionName);
  });
}

export function isLocalCurrency(
  currency: string,
  currencyOptions?: CurrencyOptionLike[]
): boolean {
  const currencyOption = findCurrencyOptionByValue(currency, currencyOptions);
  if (currencyOption?.dovizTipi === 0) return true;

  const normalized = normalizeCurrencyValue(currency);
  const aliases = resolveCurrencyAliases(currency);
  return normalized === "0" || aliases.includes("TL") || aliases.includes("TRY");
}

function findFormRate(
  currency: string,
  formRates: ExchangeRateFormLike[],
  currencyOption?: CurrencyOptionLike
): number | undefined {
  const aliases = resolveCurrencyAliases(currency);

  const directRate = formRates.find((rate) => {
    const rateCurrency = normalizeCurrencyValue(rate.currency);
    return aliases.includes(rateCurrency);
  })?.exchangeRate;
  if (directRate != null && directRate > 0) return directRate;

  const currencyAsNumber = Number(currency);
  if (!Number.isNaN(currencyAsNumber)) {
    const numericRate = formRates.find(
      (rate) => rate.dovizTipi === currencyAsNumber || Number(rate.currency) === currencyAsNumber
    )?.exchangeRate;
    if (numericRate != null && numericRate > 0) return numericRate;
  }

  if (currencyOption) {
    const optionRate = formRates.find(
      (rate) =>
        rate.dovizTipi === currencyOption.dovizTipi ||
        Number(rate.currency) === currencyOption.dovizTipi
    )?.exchangeRate;
    if (optionRate != null && optionRate > 0) return optionRate;
  }

  return undefined;
}

function findErpRate(
  currency: string,
  erpRates: ExchangeRateLike[] | undefined,
  currencyOption?: CurrencyOptionLike
): number | undefined {
  if (!erpRates || erpRates.length === 0) return undefined;

  const aliases = resolveCurrencyAliases(currency);

  const namedRate = erpRates.find((rate) => {
    const rateName = normalizeCurrencyValue(rate.dovizIsmi);
    return aliases.includes(rateName);
  })?.kurDegeri;
  if (namedRate != null && namedRate > 0) return namedRate;

  const currencyAsNumber = Number(currency);
  if (!Number.isNaN(currencyAsNumber)) {
    const numericRate = erpRates.find((rate) => rate.dovizTipi === currencyAsNumber)?.kurDegeri;
    if (numericRate != null && numericRate > 0) return numericRate;
  }

  if (currencyOption) {
    const optionRate = erpRates.find(
      (rate) => rate.dovizTipi === currencyOption.dovizTipi
    )?.kurDegeri;
    if (optionRate != null && optionRate > 0) return optionRate;
  }

  return undefined;
}

function buildRateIdentity(
  currency: string,
  currencyOptions?: CurrencyOptionLike[]
): { currencyCode: string; dovizTipi?: number } {
  const currencyOption = findCurrencyOptionByValue(currency, currencyOptions);
  if (currencyOption) {
    return {
      currencyCode: String(currencyOption.dovizTipi),
      dovizTipi: currencyOption.dovizTipi,
    };
  }

  const trimmed = normalizeCurrencyValue(currency);
  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric)) {
    return {
      currencyCode: String(numeric),
      dovizTipi: numeric,
    };
  }

  return { currencyCode: trimmed };
}

export function buildEffectiveExchangeRates(
  formRates: ExchangeRateFormLike[],
  erpRates: ExchangeRateLike[] | undefined,
  currencyOptions: CurrencyOptionLike[] | undefined,
  exchangeRateDate: string
): ExchangeRatePayloadLike[] {
  const merged = new Map<string, ExchangeRatePayloadLike>();

  const upsert = (rate: ExchangeRatePayloadLike) => {
    if (!rate.currency || !(rate.exchangeRate > 0)) return;
    merged.set(rate.currency, rate);
  };

  for (const erpRate of erpRates ?? []) {
    const identity = buildRateIdentity(
      String(erpRate.dovizTipi),
      currencyOptions
    );

    upsert({
      id: `erp-${identity.currencyCode}`,
      currency: identity.currencyCode,
      exchangeRate: erpRate.kurDegeri,
      exchangeRateDate,
      isOfficial: true,
      dovizTipi: identity.dovizTipi ?? erpRate.dovizTipi,
    });
  }

  for (const formRate of formRates) {
    const identity = buildRateIdentity(formRate.currency, currencyOptions);

    upsert({
      id: formRate.id ?? `form-${identity.currencyCode}`,
      currency: identity.currencyCode,
      exchangeRate: formRate.exchangeRate,
      exchangeRateDate: formRate.exchangeRateDate || exchangeRateDate,
      isOfficial: formRate.isOfficial ?? false,
      dovizTipi: formRate.dovizTipi ?? identity.dovizTipi,
    });
  }

  const tlOption =
    findCurrencyOptionByValue("TL", currencyOptions) ??
    findCurrencyOptionByValue("TRY", currencyOptions);

  const tlCurrencyCode = tlOption ? String(tlOption.dovizTipi) : "TRY";
  if (!merged.has(tlCurrencyCode)) {
    upsert({
      id: "default-tl",
      currency: tlCurrencyCode,
      exchangeRate: 1,
      exchangeRateDate,
      isOfficial: true,
      dovizTipi: tlOption?.dovizTipi,
    });
  }

  return Array.from(merged.values());
}

export function resolveExchangeRateByCurrency(
  currency: string,
  formRates: ExchangeRateFormLike[],
  erpRates: ExchangeRateLike[] | undefined,
  currencyOptions?: CurrencyOptionLike[]
): number | undefined {
  if (!currency) return undefined;

  const currencyOption = findCurrencyOptionByValue(currency, currencyOptions);
  const formRate = findFormRate(currency, formRates, currencyOption);
  if (formRate != null && formRate > 0) return formRate;

  return findErpRate(currency, erpRates, currencyOption);
}

export function hasDocumentExchangeRate(
  currency: string,
  formRates: ExchangeRateFormLike[],
  erpRates: ExchangeRateLike[] | undefined,
  currencyOptions?: CurrencyOptionLike[],
  options: { allowErpFallback?: boolean } = {}
): boolean {
  if (!currency || isLocalCurrency(currency, currencyOptions)) return true;

  const currencyOption = findCurrencyOptionByValue(currency, currencyOptions);
  const formRate = findFormRate(currency, formRates, currencyOption);
  if (formRate != null && formRate > 0) return true;

  if (options.allowErpFallback === false) return false;

  const erpRate = findErpRate(currency, erpRates, currencyOption);
  return erpRate != null && erpRate > 0;
}
