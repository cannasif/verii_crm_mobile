type SalesDocumentLine = {
  unitPrice: number;
};

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function applyExchangeRateChangeToLines<TLine extends SalesDocumentLine>(
  lines: TLine[],
  oldExchangeRate: number,
  newExchangeRate: number,
  calculateLineTotals: (line: TLine) => TLine,
): TLine[] {
  if (oldExchangeRate <= 0 || newExchangeRate <= 0 || oldExchangeRate === newExchangeRate) {
    return lines;
  }

  const priceScaleFactor = oldExchangeRate / newExchangeRate;

  return lines.map((line) =>
    calculateLineTotals({
      ...line,
      unitPrice: round6(line.unitPrice * priceScaleFactor),
    })
  );
}
