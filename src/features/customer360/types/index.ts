export interface Customer360ProfileDto {
  id: number;
  name: string;
  customerCode?: string | null;
  isIntegrated?: boolean;
  isERPIntegrated?: boolean;
}

export interface Customer360KpiDto {
  totalDemands: number;
  totalQuotations: number;
  totalOrders: number;
  openQuotations: number;
  openOrders: number;
  lastActivityDate?: string | null;
}

export interface Customer360SimpleItemDto {
  id: number;
  title: string;
  subtitle?: string | null;
  status?: string | null;
  amount?: number | null;
  date?: string | null;
}

export interface Customer360TimelineItemDto {
  itemId: number;
  date: string;
  type?: string | null;
  title: string;
  status?: string | null;
  amount?: number | null;
}

export interface Customer360OverviewDto {
  profile: Customer360ProfileDto;
  kpis: Customer360KpiDto;
  contacts: Customer360SimpleItemDto[];
  shippingAddresses: Customer360SimpleItemDto[];
  recentDemands: Customer360SimpleItemDto[];
  recentQuotations: Customer360SimpleItemDto[];
  recentOrders: Customer360SimpleItemDto[];
  recentActivities: Customer360SimpleItemDto[];
  timeline: Customer360TimelineItemDto[];
}

export interface Customer360QuickQuotationDto {
  id: number;
  offerDate: string;
  currencyCode: string;
  totalAmount: number;
  description?: string | null;
  isApproved: boolean;
  approvedDate?: string | null;
  quotationId?: number | null;
  quotationNo?: string | null;
  hasConvertedQuotation: boolean;
  quotationStatus?: number | null;
  quotationStatusName?: string | null;
  hasApprovalRequest: boolean;
  approvalStatus?: number | null;
  approvalStatusName?: string | null;
  approvalCurrentStep?: number | null;
  approvalFlowDescription?: string | null;
}

export interface Customer360CurrencyAmountDto {
  currency: string;
  demandAmount: number;
  quotationAmount: number;
  orderAmount: number;
}

export interface Customer360AnalyticsSummaryDto {
  currency?: string | null;
  last12MonthsOrderAmount: number;
  openQuotationAmount: number;
  openOrderAmount: number;
  lastActivityDate?: string | null;
  activityCount: number;
  totalsByCurrency?: Customer360CurrencyAmountDto[];
}

export interface Customer360MonthlyTrendItemDto {
  month: string;
  demandCount: number;
  quotationCount: number;
  orderCount: number;
}

export interface Customer360DistributionDto {
  demandCount: number;
  quotationCount: number;
  orderCount: number;
}

export interface Customer360AmountComparisonDto {
  currency?: string | null;
  last12MonthsOrderAmount: number;
  openQuotationAmount: number;
  openOrderAmount: number;
}

export interface Customer360AnalyticsChartsDto {
  monthlyTrend: Customer360MonthlyTrendItemDto[];
  distribution: Customer360DistributionDto;
  amountComparison: Customer360AmountComparisonDto;
  amountComparisonByCurrency?: Customer360AmountComparisonDto[];
}

export interface Customer360ErpMovementDto {
  cariKod: string;
  tarih?: string | null;
  vadeTarihi?: string | null;
  belgeNo?: string | null;
  aciklama?: string | null;
  dovizTuru?: number | null;
  paraBirimi?: string | null;
  borc: number;
  alacak: number;
  tarihSiraliTlBakiye: number;
  vadeSiraliTlBakiye: number;
  dovizBorc: number;
  dovizAlacak: number;
  tarihSiraliDovizBakiye: number;
  vadeSiraliDovizBakiye: number;
}

export interface Customer360ErpBalanceDto {
  cariKod: string;
  netBakiye: number;
  bakiyeDurumu: string;
  bakiyeTutari: number;
  toplamBorc: number;
  toplamAlacak: number;
}
