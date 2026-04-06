import type { ApiResponse } from "../../auth/types";
import type { PagedFilter, PagedParams, PagedResponse, PagedApiResponse } from "../../customer/types/common";

export interface ApprovalActionGetDto {
  id: number;
  approvalRequestId: number;
  entityId?: number | null;
  approvalRequestDescription?: string | null;
  demandOfferNo?: string | null;
  demandRevisionNo?: string | null;
  demandCustomerName?: string | null;
  demandCustomerCode?: string | null;
  demandOwnerName?: string | null;
  demandGrandTotal?: number | null;
  demandGrandTotalDisplay?: string | null;
  stepOrder: number;
  approvedByUserId: number;
  approvedByUserFullName?: string | null;
  actionDate: string;
  status: number;
  statusName?: string | null;
  createdDate: string;
  updatedDate?: string | null;
  createdBy?: string | null;
  createdByFullName?: string | null;
  createdByFullUser?: string | null;
}

export interface ApproveActionDto {
  approvalActionId: number;
}

export interface RejectActionDto {
  approvalActionId: number;
  rejectReason?: string | null;
}

export interface DemandLineGetDto {
  id: number;
  demandId: number;
  lineNo: number;
  stockCode?: string | null;
  stockName?: string | null;
  quantity: number;
  unitPrice: number;
  discountRate: number;
  total: number;
}

export interface DemandExchangeRateGetDto {
  id: number;
  demandId: number;
  currency: string;
  rate: number;
}

export interface DemandExchangeRateUpdateDto {
  id: number;
  demandId: number;
  demandOfferNo: string | null;
  currency: string;
  exchangeRate: number;
  exchangeRateDate: string;
  isOfficial: boolean;
}

export interface DemandGetDto {
  id: number;
  potentialCustomerId?: number | null;
  potentialCustomerName?: string | null;
  erpCustomerCode?: string | null;
  deliveryDate?: string | null;
  shippingAddressId?: number | null;
  shippingAddressText?: string | null;
  representativeId?: number | null;
  representativeName?: string | null;
  status?: number | null;
  description?: string | null;
  paymentTypeId?: number | null;
  paymentTypeName?: string | null;
  documentSerialTypeId?: number | null;
  offerType: string;
  offerDate?: string | null;
  offerNo?: string | null;
  revisionNo?: string | null;
  revisionId?: number | null;
  currency: string;
  currencyCode?: string | null;
  currencyDisplay?: string | null;
  total: number;
  grandTotal: number;
  grandTotalDisplay?: string | null;
  hasCustomerSpecificDiscount: boolean;
  validUntil?: string | null;
  contactId?: number | null;
  activityId?: number | null;
  createdAt: string;
  updatedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  lines?: DemandLineGetDto[];
  exchangeRates?: DemandExchangeRateGetDto[];
}

export interface CreateDemandDto {
  potentialCustomerId?: number | null;
  erpCustomerCode?: string | null;
  deliveryDate?: string | null;
  shippingAddressId?: number | null;
  representativeId?: number | null;
  status?: number | null;
  description?: string | null;
  paymentTypeId?: number | null;
  documentSerialTypeId?: number | null;
  offerType: string;
  offerDate?: string | null;
  offerNo?: string | null;
  revisionNo?: string | null;
  revisionId?: number | null;
  currency: string;
}

export interface CreateDemandLineDto {
  demandId: number;
  productId?: number | null;
  productCode: string;
  productName: string;
  groupCode?: string | null;
  quantity: number;
  unitPrice: number;
  discountRate1: number;
  discountAmount1: number;
  discountRate2: number;
  discountAmount2: number;
  discountRate3: number;
  discountAmount3: number;
  vatRate: number;
  vatAmount: number;
  lineTotal: number;
  lineGrandTotal: number;
  description?: string | null;
  pricingRuleHeaderId?: number | null;
  relatedStockId?: number | null;
  relatedProductKey?: string | null;
  isMainRelatedProduct?: boolean;
  approvalStatus?: number;
}

export interface DemandLineUpdateDto {
  id: number;
  demandId: number;
  productId?: number | null;
  productCode: string;
  productName: string;
  groupCode?: string | null;
  quantity: number;
  unitPrice: number;
  discountRate1: number;
  discountAmount1: number;
  discountRate2: number;
  discountAmount2: number;
  discountRate3: number;
  discountAmount3: number;
  vatRate: number;
  vatAmount: number;
  lineTotal: number;
  lineGrandTotal: number;
  description?: string | null;
  pricingRuleHeaderId?: number | null;
  relatedStockId?: number | null;
  relatedProductKey?: string | null;
  isMainRelatedProduct?: boolean;
  approvalStatus?: number;
  createdAt?: string | null;
}

export interface DemandExchangeRateCreateDto {
  demandId: number;
  currency: string;
  exchangeRate: number;
  exchangeRateDate: string;
  isOfficial?: boolean;
}

export interface DemandBulkCreateDto {
  demand: CreateDemandDto;
  lines: CreateDemandLineDto[];
  exchangeRates?: DemandExchangeRateCreateDto[];
}

export interface DemandLineFormState {
  id: string;
  productId?: number | null;
  productCode: string;
  productName: string;
  unit?: string | null;
  groupCode?: string | null;
  quantity: number;
  unitPrice: number;
  discountRate1: number;
  discountAmount1: number;
  discountRate2: number;
  discountAmount2: number;
  discountRate3: number;
  discountAmount3: number;
  vatRate: number;
  vatAmount: number;
  lineTotal: number;
  lineGrandTotal: number;
  description?: string | null;
  pricingRuleHeaderId?: number | null;
  relatedStockId?: number | null;
  relatedProductKey?: string | null;
  isMainRelatedProduct?: boolean;
  approvalStatus?: number;
  isEditing: boolean;
  relatedLines?: DemandLineFormState[];
  relationQuantity?: number;
}

export interface DemandExchangeRateFormState {
  id: string;
  currency: string;
  exchangeRate: number;
  exchangeRateDate: string;
  isOfficial?: boolean;
  dovizTipi?: number;
}

export interface PricingRuleLineGetDto {
  id: number;
  pricingRuleHeaderId: number;
  stokCode: string;
  minQuantity: number;
  maxQuantity?: number | null;
  fixedUnitPrice?: number | null;
  currencyCode: string;
  discountRate1: number;
  discountAmount1: number;
  discountRate2: number;
  discountAmount2: number;
  discountRate3: number;
  discountAmount3: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface UserDiscountLimitDto {
  erpProductGroupCode: string;
  salespersonId: number;
  salespersonName: string;
  maxDiscount1: number;
  maxDiscount2?: number | null;
  maxDiscount3?: number | null;
  id?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: number | null;
  updatedBy?: number | null;
  deletedBy?: number | null;
}

export interface PriceOfProductRequestDto {
  productCode: string;
  groupCode: string;
}

export interface PriceOfProductDto {
  productCode: string;
  groupCode: string;
  currency: string;
  listPrice: number;
  costPrice: number;
  discount1?: number | null;
  discount2?: number | null;
  discount3?: number | null;
}

export interface ExchangeRateDto {
  dovizTipi: number;
  dovizIsmi: string | null;
  kurDegeri: number;
  tarih: string;
}

export interface CurrencyOptionDto {
  code: string;
  dovizTipi: number;
  dovizIsmi: string | null;
}

export interface PaymentTypeDto {
  id: number;
  name: string;
}

export interface DocumentSerialTypeDto {
  id: number;
  serialPrefix?: string | null;
  name?: string | null;
  documentType?: number;
  customerTypeId?: number;
  salesRepId?: number;
}

export interface ApprovalScopeUserDto {
  flowId: number;
  userId: number;
  firstName: string;
  lastName: string;
  roleGroupName: string;
  stepOrder: number;
}

export interface UserDto {
  id: number;
  username: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  role: string;
  fullName: string;
  isActive: boolean;
  isDeleted: boolean;
  createdDate: string;
}

export const PricingRuleType = {
  Demand: 2,
} as const;

export const OfferType = {
  Domestic: "Domestic",
  Export: "Export",
} as const;

export type OfferTypeValue = typeof OfferType[keyof typeof OfferType];

export interface CalculationTotals {
  subtotal: number;
  totalVat: number;
  grandTotal: number;
}

export type ApprovalStatus = 0 | 1;

export type DetailApprovalStatus = 0 | 1 | 2 | 3;

export const APPROVAL_HAVENOT_STARTED: DetailApprovalStatus = 0;
export const APPROVAL_WAITING: DetailApprovalStatus = 1;
export const APPROVAL_APPROVED: DetailApprovalStatus = 2;
export const APPROVAL_REJECTED: DetailApprovalStatus = 3;

export interface DemandDetailGetDto {
  id: number;
  year: string | null;
  completionDate: string | null;
  isCompleted: boolean;
  isPendingApproval: boolean;
  approvalStatus: boolean | null;
  rejectedReason: string | null;
  approvedByUserId: number | null;
  approvalDate: string | null;
  isERPIntegrated: boolean;
  erpIntegrationNumber: string | null;
  lastSyncDate: string | null;
  countTriedBy: number | null;
  createdDate: string;
  updatedDate: string | null;
  deletedDate: string | null;
  isDeleted: boolean;
  createdByFullUser: string | null;
  updatedByFullUser: string | null;
  deletedByFullUser: string | null;
  potentialCustomerId: number | null;
  potentialCustomerName: string | null;
  erpCustomerCode: string | null;
  deliveryDate: string | null;
  shippingAddressId: number | null;
  shippingAddressText: string | null;
  representativeId: number | null;
  representativeName: string | null;
  status: DetailApprovalStatus | null;
  description: string | null;
  paymentTypeId: number | null;
  paymentTypeName: string | null;
  documentSerialTypeId: number;
  documentSerialTypeName: string | null;
  offerType: string;
  offerDate: string | null;
  offerNo: string | null;
  revisionNo: string | null;
  revisionId: number | null;
  currency: string;
  createdBy: string | null;
  updatedBy: string | null;
  approvalActionId?: number | null;
}

export interface DemandLineDetailGetDto {
  id: number;
  demandId: number;
  productId: number | null;
  productCode: string | null;
  productName: string;
  groupCode: string | null;
  quantity: number;
  unitPrice: number;
  discountRate1: number;
  discountAmount1: number;
  discountRate2: number;
  discountAmount2: number;
  discountRate3: number;
  discountAmount3: number;
  vatRate: number;
  vatAmount: number;
  lineTotal: number;
  lineGrandTotal: number;
  description: string | null;
  pricingRuleHeaderId: number | null;
  relatedStockId: number | null;
  relatedProductKey: string | null;
  isMainRelatedProduct: boolean;
  approvalStatus: DetailApprovalStatus;
  createdDate: string;
  updatedDate: string | null;
  isDeleted: boolean;
  createdByFullUser: string | null;
  updatedByFullUser: string | null;
}

export interface DemandExchangeRateDetailGetDto {
  id: number;
  demandId: number;
  demandOfferNo: string | null;
  currency: string;
  exchangeRate: number;
  exchangeRateDate: string;
  isOfficial: boolean;
  createdDate: string;
  updatedDate: string | null;
  isDeleted: boolean;
}

export interface ApprovalActionDetailDto {
  userId: number;
  userFullName: string | null;
  userEmail: string | null;
  status: number;
  statusName: string;
  actionDate: string | null;
  rejectedReason: string | null;
}

export interface ApprovalFlowStepReportDto {
  stepOrder: number;
  stepName: string;
  stepStatus: string;
  actions: ApprovalActionDetailDto[];
}

export interface DemandApprovalFlowReportDto {
  demandId: number;
  demandOfferNo: string | null;
  hasApprovalRequest: boolean;
  overallStatus: number | null;
  overallStatusName: string | null;
  currentStep: number;
  flowDescription: string | null;
  rejectedReason: string | null;
  steps: ApprovalFlowStepReportDto[];
}

export type DemandDetailResponse = ApiResponse<DemandDetailGetDto>;
export type DemandLineDetailListResponse = ApiResponse<DemandLineDetailGetDto[]>;
export type DemandExchangeRateDetailListResponse = ApiResponse<DemandExchangeRateDetailGetDto[]>;
export type DemandExchangeRateUpdateResponse = ApiResponse<boolean>;
export type DemandApprovalFlowReportResponse = ApiResponse<DemandApprovalFlowReportDto>;

export type WaitingApprovalsResponse =
  ApiResponse<ApprovalActionGetDto[] | PagedResponse<ApprovalActionGetDto>>;
export type ApproveResponse = ApiResponse<boolean>;
export type RejectResponse = ApiResponse<boolean>;
export type DemandListResponse = PagedApiResponse<DemandGetDto>;
export type DemandResponse = ApiResponse<DemandGetDto>;
export type DemandBulkCreateResponse = ApiResponse<DemandGetDto>;
export type PriceRuleResponse = ApiResponse<PricingRuleLineGetDto[]>;
export type UserDiscountLimitResponse = ApiResponse<UserDiscountLimitDto[]>;
export type PriceOfProductResponse = ApiResponse<PriceOfProductDto[]>;
export type ExchangeRateResponse = ApiResponse<ExchangeRateDto[]>;
export type CurrencyOptionsResponse = ApiResponse<CurrencyOptionDto[]>;
export type PaymentTypesResponse = ApiResponse<PaymentTypeDto[]>;
export type DocumentSerialTypesResponse = ApiResponse<DocumentSerialTypeDto[]>;
export type RelatedUsersResponse = ApiResponse<ApprovalScopeUserDto[]>;
export type UserListResponse = ApiResponse<PagedResponse<UserDto>>;

export type { PagedFilter, PagedParams, PagedResponse };
export type { StockGetDto } from "../../stocks/types";
