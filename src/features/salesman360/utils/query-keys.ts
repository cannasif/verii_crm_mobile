import type { Salesmen360PeriodParams } from "../types/salesman360-types";

const periodParts = (periodParams?: Salesmen360PeriodParams) =>
  [periodParams?.period, periodParams?.startDate, periodParams?.endDate] as const;

export const salesman360QueryKeys = {
  all: () => ["salesman360"] as const,
  visibleUsers: () => [...salesman360QueryKeys.all(), "visible-users"] as const,
  overviewByUser: (userId: number | undefined) =>
    [...salesman360QueryKeys.all(), "overview", userId] as const,
  overview: (
    userId: number | undefined,
    currency: string | null,
    periodParams?: Salesmen360PeriodParams,
  ) => [...salesman360QueryKeys.overviewByUser(userId), currency, ...periodParts(periodParams)] as const,
  analyticsSummary: (
    userId: number | undefined,
    currency: string | null,
    periodParams?: Salesmen360PeriodParams,
  ) => [
    ...salesman360QueryKeys.all(),
    "analytics",
    "summary",
    userId,
    currency,
    ...periodParts(periodParams),
  ] as const,
  analyticsCharts: (
    userId: number | undefined,
    months: number,
    currency: string | null,
    periodParams?: Salesmen360PeriodParams,
  ) => [
    ...salesman360QueryKeys.all(),
    "analytics",
    "charts",
    userId,
    months,
    currency,
    ...periodParts(periodParams),
  ] as const,
  cohortByUser: (userId: number | undefined) =>
    [...salesman360QueryKeys.all(), "cohort", userId] as const,
  cohort: (userId: number | undefined, months: number) =>
    [...salesman360QueryKeys.cohortByUser(userId), months] as const,
};
