import { apiClient } from "../../../lib/axios";
import type { ApiResponse } from "../../auth/types";
import type {
  Salesmen360OverviewDto,
  Salesmen360AnalyticsSummaryDto,
  Salesmen360AnalyticsChartsDto,
  Salesmen360VisibleUserDto,
  CohortRetentionDto,
  ExecuteRecommendedActionDto,
  ActivityDto,
} from "../types";

const SALESMEN_360_STALE_MS = 30 * 1000;
const SALESMEN_360_COHORT_STALE_MS = 5 * 60 * 1000;
const SALESMEN_360_VISIBLE_USERS_STALE_MS = 60 * 1000;

function buildConfig(currency: string | null): { params?: { currency: string }; headers?: { "X-Currency": string; Currency: string } } {
  if (currency == null || currency === "" || currency === "ALL") {
    return {};
  }
  return {
    params: { currency },
    headers: {
      "X-Currency": currency,
      Currency: currency,
    },
  };
}

function getOverviewPath(userId: number): string {
  return `/api/salesmen/${userId}/overview`;
}

function getAnalyticsSummaryPath(userId: number): string {
  return `/api/salesmen/${userId}/analytics/summary`;
}

function getAnalyticsChartsPath(userId: number): string {
  return `/api/salesmen/${userId}/analytics/charts`;
}

function getCohortPath(userId: number): string {
  return `/api/salesmen/${userId}/analytics/cohort`;
}

function getRecommendedActionPath(userId: number): string {
  return `/api/salesmen/${userId}/recommended-actions/execute`;
}

function assertSuccess<T>(response: { data: ApiResponse<T> & { data: T | null } }, fallbackMessage: string): T {
  const body = response.data;
  if (body.success !== true || body.data == null) {
    const msg =
      [body.message, body.exceptionMessage].filter(Boolean).join(" — ") || fallbackMessage;
    throw new Error(msg);
  }
  return body.data;
}

export const salesman360Api = {
  getVisibleUsers: async (): Promise<Salesmen360VisibleUserDto[]> => {
    const response = await apiClient.get<
      ApiResponse<Salesmen360VisibleUserDto[]> & { data: Salesmen360VisibleUserDto[] | null }
    >("/api/salesmen/visible-users");
    return assertSuccess(response, "Satışçı listesi yüklenemedi");
  },

  getOverview: async (userId: number, currency: string | null): Promise<Salesmen360OverviewDto> => {
    const config = buildConfig(currency);
    const response = await apiClient.get<ApiResponse<Salesmen360OverviewDto> & { data: Salesmen360OverviewDto | null }>(
      getOverviewPath(userId),
      config
    );
    return assertSuccess(response, "Özet yüklenemedi");
  },

  getAnalyticsSummary: async (
    userId: number,
    currency: string | null
  ): Promise<Salesmen360AnalyticsSummaryDto> => {
    const config = buildConfig(currency);
    const response = await apiClient.get<
      ApiResponse<Salesmen360AnalyticsSummaryDto> & { data: Salesmen360AnalyticsSummaryDto | null }
    >(getAnalyticsSummaryPath(userId), config);
    return assertSuccess(response, "Analitik özet yüklenemedi");
  },

  getAnalyticsCharts: async (
    userId: number,
    months: number,
    currency: string | null
  ): Promise<Salesmen360AnalyticsChartsDto> => {
    const config = buildConfig(currency);
    const params = { months, ...(config.params ?? {}) };
    const response = await apiClient.get<
      ApiResponse<Salesmen360AnalyticsChartsDto> & { data: Salesmen360AnalyticsChartsDto | null }
    >(getAnalyticsChartsPath(userId), { ...config, params });
    return assertSuccess(response, "Grafik verisi yüklenemedi");
  },

  getCohort: async (userId: number, months: number): Promise<CohortRetentionDto[]> => {
    const response = await apiClient.get<
      ApiResponse<CohortRetentionDto[]> & { data: CohortRetentionDto[] | null }
    >(getCohortPath(userId), { params: { months } });
    return assertSuccess(response, "Cohort verisi yüklenemedi");
  },

  executeRecommendedAction: async (
    userId: number,
    payload: ExecuteRecommendedActionDto
  ): Promise<ActivityDto> => {
    const response = await apiClient.post<
      ApiResponse<ActivityDto> & { data: ActivityDto | null }
    >(getRecommendedActionPath(userId), payload);
    return assertSuccess(response, "Önerilen aksiyon oluşturulamadı");
  },
};

export { SALESMEN_360_STALE_MS, SALESMEN_360_COHORT_STALE_MS, SALESMEN_360_VISIBLE_USERS_STALE_MS };
