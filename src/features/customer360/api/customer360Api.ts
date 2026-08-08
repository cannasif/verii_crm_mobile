import { apiClient } from "../../../lib/axios";
import type { ApiResponse } from "../../auth/types/auth-types";
import type {
  Customer360OverviewDto,
  Customer360QuickQuotationDto,
  Customer360AnalyticsSummaryDto,
  Customer360AnalyticsChartsDto,
  Customer360ErpMovementDto,
  Customer360ErpBalanceDto,
} from "../types";

const CUSTOMER_360_OVERVIEW_STALE_MS = 30 * 1000;
const CUSTOMER_360_SUMMARY_STALE_MS = 30 * 1000;
const CUSTOMER_360_CHARTS_STALE_MS = 45 * 1000;
const CUSTOMER_360_QUICK_QUOTATIONS_STALE_MS = 30 * 1000;
const CUSTOMER_360_ERP_MOVEMENTS_STALE_MS = 30 * 1000;
const CUSTOMER_360_ERP_BALANCE_STALE_MS = 30 * 1000;

function buildConfig(currency: string | null): {
  params?: { currency: string };
  headers?: { "X-Currency": string; Currency: string };
} {
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

function getOverviewPath(customerId: number): string {
  return `/api/customers/${customerId}/overview`;
}

function getAnalyticsSummaryPath(customerId: number): string {
  return `/api/customers/${customerId}/analytics/summary`;
}

function getAnalyticsChartsPath(customerId: number): string {
  return `/api/customers/${customerId}/analytics/charts`;
}

function assertSuccess<T>(
  response: { data: ApiResponse<T> & { data: T | null } },
  fallbackMessage: string
): T {
  const body = response.data;
  if (body.success !== true || body.data == null) {
    const msg =
      [body.message, body.exceptionMessage].filter(Boolean).join(" — ") ||
      fallbackMessage;
    throw new Error(msg);
  }
  return body.data;
}

export const customer360Api = {
  getOverview: async (
    customerId: number,
    currency: string | null
  ): Promise<Customer360OverviewDto> => {
    const config = buildConfig(currency);
    const response = await apiClient.get<
      ApiResponse<Customer360OverviewDto> & { data: Customer360OverviewDto | null }
    >(getOverviewPath(customerId), config);
    return assertSuccess(response, "Özet yüklenemedi");
  },

  getAnalyticsSummary: async (
    customerId: number,
    currency: string | null
  ): Promise<Customer360AnalyticsSummaryDto> => {
    const config = buildConfig(currency);
    const response = await apiClient.get<
      ApiResponse<Customer360AnalyticsSummaryDto> & {
        data: Customer360AnalyticsSummaryDto | null;
      }
    >(getAnalyticsSummaryPath(customerId), config);
    return assertSuccess(response, "Analitik özet yüklenemedi");
  },

  getAnalyticsCharts: async (
    customerId: number,
    months: number,
    currency: string | null
  ): Promise<Customer360AnalyticsChartsDto> => {
    const config = buildConfig(currency);
    const params = { months, ...(config.params ?? {}) };
    const response = await apiClient.get<
      ApiResponse<Customer360AnalyticsChartsDto> & {
        data: Customer360AnalyticsChartsDto | null;
      }
    >(getAnalyticsChartsPath(customerId), { ...config, params });
    return assertSuccess(response, "Grafik verisi yüklenemedi");
  },

  getQuickQuotations: async (
    customerId: number
  ): Promise<Customer360QuickQuotationDto[]> => {
    const response = await apiClient.get<
      ApiResponse<Customer360QuickQuotationDto[]> & {
        data: Customer360QuickQuotationDto[] | null;
      }
    >(`/api/customers/${customerId}/quick-quotations`);
    return assertSuccess(response, "Hızlı teklifler yüklenemedi");
  },

  getErpMovements: async (
    customerId: number
  ): Promise<Customer360ErpMovementDto[]> => {
    const response = await apiClient.get<
      ApiResponse<Customer360ErpMovementDto[]> & {
        data: Customer360ErpMovementDto[] | null;
      }
    >(`/api/customers/${customerId}/erp-movements`);
    return assertSuccess(response, "ERP hareketleri yüklenemedi");
  },

  getErpBalance: async (
    customerId: number
  ): Promise<Customer360ErpBalanceDto> => {
    const response = await apiClient.get<
      ApiResponse<Customer360ErpBalanceDto> & {
        data: Customer360ErpBalanceDto | null;
      }
    >(`/api/customers/${customerId}/erp-balance`);
    return assertSuccess(response, "ERP bakiye özeti yüklenemedi");
  },
};

export {
  CUSTOMER_360_OVERVIEW_STALE_MS,
  CUSTOMER_360_SUMMARY_STALE_MS,
  CUSTOMER_360_CHARTS_STALE_MS,
  CUSTOMER_360_QUICK_QUOTATIONS_STALE_MS,
  CUSTOMER_360_ERP_MOVEMENTS_STALE_MS,
  CUSTOMER_360_ERP_BALANCE_STALE_MS,
};
