import { apiClient } from "../../../lib/axios";
import type { ApiResponse } from "../../auth/types";
import type { ActivityDto } from "../../activity/types";
import type { DailyTaskFilter } from "../types";

interface PagedFilter {
  column: string;
  operator: string;
  value: string;
}

interface RawPagedPayload<T> {
  items?: T[];
  data?: T[];
  totalCount?: number;
  TotalCount?: number;
}

function normalizeItems<T>(raw: RawPagedPayload<T> | null | undefined): T[] {
  const items = raw?.items ?? raw?.data ?? [];
  return Array.isArray(items) ? items : [];
}

const buildFilters = (filter: DailyTaskFilter): PagedFilter[] => {
  const filters: PagedFilter[] = [];
  const startDateOnly =
    filter.startDate && filter.startDate.includes("T")
      ? filter.startDate.split("T")[0]
      : filter.startDate;
  const endDateOnly =
    filter.endDate && filter.endDate.includes("T")
      ? filter.endDate.split("T")[0]
      : filter.endDate;

  if (startDateOnly) {
    filters.push({
      column: "StartDateTime",
      operator: "gte",
      value: startDateOnly,
    });
  }

  if (endDateOnly) {
    filters.push({
      column: "StartDateTime",
      operator: "lte",
      value: endDateOnly,
    });
  }

  if (filter.assignedUserId != null) {
    filters.push({
      column: "AssignedUserId",
      operator: "eq",
      value: String(filter.assignedUserId),
    });
  }

  if (filter.status != null) {
    const statusValue =
      typeof filter.status === "number"
        ? String(filter.status)
        : filter.status === "Completed"
          ? "1"
          : filter.status === "Scheduled"
            ? "0"
            : filter.status === "Cancelled"
              ? "2"
              : String(filter.status);
    filters.push({
      column: "Status",
      operator: "eq",
      value: statusValue,
    });
  }

  return filters;
};

export const dailyTasksApi = {
  getList: async (filter: DailyTaskFilter): Promise<ActivityDto[]> => {
    const filters = buildFilters(filter);

    const response = await apiClient.post<
      ApiResponse<RawPagedPayload<ActivityDto>>
    >("/api/Activity/query", {
        pageNumber: 1,
        pageSize: 1000,
        search: "",
        sortBy: "StartDateTime",
        sortDirection: "asc",
        filterLogic: "and",
        filters,
      }
    });

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Görevler alınamadı"
      );
    }

    return normalizeItems(response.data.data);
  },

  updateStatus: async (
    id: number,
    status: string,
    isCompleted: boolean
  ): Promise<ActivityDto> => {
    const response = await apiClient.put<ApiResponse<ActivityDto>>(`/api/Activity/${id}`, {
      status,
      isCompleted,
    });

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Görev güncellenemedi"
      );
    }

    return response.data.data;
  },
};
