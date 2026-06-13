import { useCallback, useEffect, useMemo, useState } from "react";
import { useErpOrders } from "./useErpOrders";
import {
  filterErpOrdersByCustomerCode,
  filterErpOrdersBySearch,
  sortErpOrders,
} from "../utils/erpOrderListProcessing";
import type { ErpOrderSortField } from "../types";
import { ERP_ORDER_PAGE_SIZE } from "../types";

interface UseErpOrderListControllerOptions {
  customerErpCode?: string | null;
  pageSize?: number;
}

export function useErpOrderListController(options: UseErpOrderListControllerOptions = {}) {
  const pageSize = options.pageSize ?? ERP_ORDER_PAGE_SIZE;
  const { data, isPending, isError, error, refetch, isRefetching } = useErpOrders();

  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<ErpOrderSortField>("tarih");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [visibleCount, setVisibleCount] = useState(pageSize);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [debouncedSearch, sortBy, sortDirection, options.customerErpCode, pageSize]);

  const processedItems = useMemo(() => {
    const source = data ?? [];
    const scoped = filterErpOrdersByCustomerCode(source, options.customerErpCode);
    const searched = filterErpOrdersBySearch(scoped, debouncedSearch);
    return sortErpOrders(searched, sortBy, sortDirection);
  }, [data, debouncedSearch, options.customerErpCode, sortBy, sortDirection]);

  const visibleItems = useMemo(
    () => processedItems.slice(0, visibleCount),
    [processedItems, visibleCount]
  );

  const hasMore = visibleCount < processedItems.length;

  const loadMore = useCallback(() => {
    if (!hasMore) return;
    setVisibleCount((current) => current + pageSize);
  }, [hasMore, pageSize]);

  const toggleSortDirection = useCallback(() => {
    setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
  }, []);

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    searchText,
    setSearchText,
    sortBy,
    setSortBy,
    sortDirection,
    toggleSortDirection,
    processedItems,
    visibleItems,
    totalCount: processedItems.length,
    hasMore,
    loadMore,
    isPending,
    isError,
    error,
    refresh,
    isRefetching,
  };
}
