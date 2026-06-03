import type { WarehouseBalanceTone, WarehouseStockBalanceDto } from "../types";

export function computeTotalBalance(rows: WarehouseStockBalanceDto[]): number {
  return rows.reduce((sum, row) => sum + (Number(row.balance) || 0), 0);
}

export function resolveWarehouseBalanceTone(totalBalance: number): WarehouseBalanceTone {
  return totalBalance < 0 ? "negative" : "positive";
}

export function formatWarehouseBalanceAmount(value: number): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0";

  const isWholeNumber = Number.isInteger(numeric);
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: isWholeNumber ? 0 : 0,
    maximumFractionDigits: 2,
  }).format(numeric);
}

export function formatWarehouseBalanceWithUnit(total: number, unit?: string | null): string {
  const formatted = formatWarehouseBalanceAmount(total);
  const normalizedUnit = typeof unit === "string" ? unit.trim() : "";
  return normalizedUnit ? `${formatted} ${normalizedUnit}` : formatted;
}

export function resolveWarehouseDisplayName(row: WarehouseStockBalanceDto): string {
  const name = typeof row.warehouseName === "string" ? row.warehouseName.trim() : "";
  if (name) return name;
  return String(row.warehouseCode);
}
