import type { ErpOrderSortField, NetsisOrderHeader } from "../types";
import { ERP_ORDER_NUMERIC_SORT_FIELDS } from "../types";

export function filterErpOrdersBySearch(
  items: NetsisOrderHeader[],
  searchTerm: string
): NetsisOrderHeader[] {
  const query = searchTerm.trim().toLocaleLowerCase("tr-TR");
  if (!query) return items;

  return items.filter((item) => {
    const haystack = [
      item.fatirsNo,
      item.cariKodu,
      item.cariIsim,
      item.plasiyerKodu,
      item.tarih,
      item.teslimTarihi,
    ]
      .map((value) => String(value ?? "").toLocaleLowerCase("tr-TR"))
      .join(" ");
    return haystack.includes(query);
  });
}

export function filterErpOrdersByCustomerCode(
  items: NetsisOrderHeader[],
  customerErpCode: string | null | undefined
): NetsisOrderHeader[] {
  const normalizedCustomerCode = normalizeErpCode(customerErpCode);
  if (!normalizedCustomerCode) return items;
  return items.filter(
    (item) => normalizeErpCode(item.cariKodu) === normalizedCustomerCode
  );
}

export function normalizeErpCode(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLocaleUpperCase("tr-TR");
}

function compareErpOrderValues(
  left: NetsisOrderHeader[ErpOrderSortField],
  right: NetsisOrderHeader[ErpOrderSortField],
  field: ErpOrderSortField
): number {
  if (ERP_ORDER_NUMERIC_SORT_FIELDS.has(field)) {
    const leftNumber = Number(left);
    const rightNumber = Number(right);
    const safeLeft = Number.isNaN(leftNumber) ? 0 : leftNumber;
    const safeRight = Number.isNaN(rightNumber) ? 0 : rightNumber;
    return safeLeft - safeRight;
  }

  return String(left ?? "").localeCompare(String(right ?? ""), "tr-TR");
}

export function sortErpOrders(
  items: NetsisOrderHeader[],
  sortBy: ErpOrderSortField,
  sortDirection: "asc" | "desc"
): NetsisOrderHeader[] {
  const multiplier = sortDirection === "asc" ? 1 : -1;
  return [...items].sort((left, right) => {
    const result = compareErpOrderValues(left[sortBy], right[sortBy], sortBy);
    if (result !== 0) return result * multiplier;
    return left.fatirsNo.localeCompare(right.fatirsNo, "tr-TR") * multiplier;
  });
}

export function buildErpOrderLineKey(line: {
  fatirsNo: string;
  sira: number;
  stokKodu: string;
}): string {
  return `${line.fatirsNo}-${line.sira}-${line.stokKodu}`;
}
