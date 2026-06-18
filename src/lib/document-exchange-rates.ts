interface DocumentExchangeRateFormState {
  dovizTipi?: number | null;
  currency?: string | number | null;
  exchangeRate?: number | null;
}

export function buildDocumentExchangeRatesForLines(
  rates: DocumentExchangeRateFormState[] | null | undefined
): Array<{ dovizTipi: number; kurDegeri: number }> {
  const rows = (rates ?? [])
    .map((rate) => {
      const dovizTipi =
        typeof rate.dovizTipi === "number"
          ? rate.dovizTipi
          : Number.parseInt(String(rate.currency ?? ""), 10);
      const kurDegeri = Number(rate.exchangeRate ?? 0);

      return Number.isFinite(dovizTipi) && Number.isFinite(kurDegeri) && kurDegeri > 0
        ? { dovizTipi, kurDegeri }
        : null;
    })
    .filter((rate): rate is { dovizTipi: number; kurDegeri: number } => Boolean(rate));

  return rows.some((rate) => rate.dovizTipi === 0)
    ? rows
    : [{ dovizTipi: 0, kurDegeri: 1 }, ...rows];
}
