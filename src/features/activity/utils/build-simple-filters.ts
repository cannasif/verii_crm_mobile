import type { PagedFilter } from "../types/activity-types";

export type ActivityListActiveFilter = "all" | "active" | "completed";

export function buildSimpleFilters(
  searchTerm: string,
  activeFilter: ActivityListActiveFilter
): PagedFilter[] {
  const filters: PagedFilter[] = [];
  const trimmed = searchTerm.trim();
  if (trimmed.length >= 2) {
    filters.push({ column: "Subject", operator: "Contains", value: trimmed });
  }
  if (activeFilter === "active") {
    filters.push({ column: "Status", operator: "Equals", value: "0" });
  }
  if (activeFilter === "completed") {
    filters.push({ column: "Status", operator: "Equals", value: "1" });
  }
  return filters;
}
