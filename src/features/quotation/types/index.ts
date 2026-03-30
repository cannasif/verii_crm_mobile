import type { ApiResponse } from "../../auth/types";
import type { PagedFilter, PagedParams, PagedResponse, PagedApiResponse } from "../../customer/types/common";

export interface ApprovalActionGetDto {
  id: number;
  approvalRequestId: number;
  entityId?: number | null;
  approvalRequestDescription?: string | null;
  quotationOfferNo?: string | null;
  quotationRevisionNo?: string | null;
  quotationCustomerName?: string | null;
  quotationCustomerCode?: string | null;
  quotationOwnerName?: string | null;
  quotationGrandTotal?: number | null;
  quotationGrandTotalDisplay?: string | null;
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

export interface QuotationLineGetDto {
  id: number;
  quotationId: number;
  lineNo: number;
  stockCode?: string | null;
  stockName?: string | null;
  quantity: number;
  unitPrice: number;
  discountRate: number;
  total: number;
}

export interface QuotationExchangeRateGetDto {
  id: number;
  quotationId: number;
  currency: string;
  rate: number;
}

export interface QuotationExchangeRateUpdateDto {
  id: number;
  quotationId: number;
  quotationOfferNo: string | null;
  currency: string;
  exchangeRate: number;
  exchangeRateDate: string;
  isOfficial: boolean;
}

export interface QuotationGetDto {
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
  lines?: QuotationLineGetDto[];
  exchangeRates?: QuotationExchangeRateGetDto[];
}

export const OfferType = {
  YURTICI: "YURTICI",
  YURTDISI: "YURTDISI",
} as const;

export type OfferTypeValue = (typeof OfferType)[keyof typeof OfferType];

export const DEFAULT_OFFER_TYPE: OfferTypeValue = OfferType.YURTICI;

export function normalizeOfferType(value: string | null | undefined): OfferTypeValue {
  if (value === OfferType.YURTICI || value === OfferType.YURTDISI) return value;
  if (value === "Domestic") return OfferType.YURTICI;
  if (value === "Export") return OfferType.YURTDISI;
  return DEFAULT_OFFER_TYPE;
}

export interface CreateQuotationDto {
  potentialCustomerId?: number | null;
  erpCustomerCode?: string | null;
  deliveryDate?: string | null;
  shippingAddressId?: number | null;
  representativeId?: number | null;
  status?: number | null;
  description?: string | null;
  paymentTypeId?: number | null;
  documentSerialTypeId: number;
  offerType: string;
  offerDate?: string | null;
  offerNo?: string | null;
  revisionNo?: string | null;
  revisionId?: number | null;
  currency: string;
  generalDiscountRate?: number | null;
  generalDiscountAmount?: number | null;
  demandId?: number | null;
  erpProjectCode?: string | null;
  salesTypeDefinitionId?: number | null;
}

export interface CreateQuotationLineDto {
  quotationId: number;
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
  description1?: string | null;
  description2?: string | null;
  description3?: string | null;
  pricingRuleHeaderId?: number | null;
  relatedStockId?: number | null;
  relatedProductKey?: string | null;
  isMainRelatedProduct?: boolean;
  erpProjectCode?: string | null;
  approvalStatus?: number;
}

export interface QuotationLineUpdateDto {
  id: number;
  quotationId: number;
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
  description1?: string | null;
  description2?: string | null;
  description3?: string | null;
  pricingRuleHeaderId?: number | null;
  relatedStockId?: number | null;
  relatedProductKey?: string | null;
  isMainRelatedProduct?: boolean;
  erpProjectCode?: string | null;
  approvalStatus?: number;
  createdAt?: string | null;
}

export interface QuotationExchangeRateCreateDto {
  quotationId: number;
  currency: string;
  exchangeRate: number;
  exchangeRateDate: string;
  isOfficial?: boolean;
}

export interface QuotationNotesDto {
  note1?: string;
  note2?: string;
  note3?: string;
  note4?: string;
  note5?: string;
  note6?: string;
  note7?: string;
  note8?: string;
  note9?: string;
  note10?: string;
  note11?: string;
  note12?: string;
  note13?: string;
  note14?: string;
  note15?: string;
}

export interface QuotationNotesGetDto {
  id: number;
  quotationId: number;
  note1: string | null;
  note2: string | null;
  note3: string | null;
  note4: string | null;
  note5: string | null;
  note6: string | null;
  note7: string | null;
  note8: string | null;
  note9: string | null;
  note10: string | null;
  note11: string | null;
  note12: string | null;
  note13: string | null;
  note14: string | null;
  note15: string | null;
}

export interface UpdateQuotationNotesListDto {
  notes: string[];
}

export interface QuotationBulkCreateDto {
  quotation: CreateQuotationDto;
  lines: CreateQuotationLineDto[];
  exchangeRates?: QuotationExchangeRateCreateDto[];
  quotationNotes?: QuotationNotesDto;
}

export interface QuotationLineFormState {
  id: string;
  productId?: number | null;
  productCode: string;
  productName: string;
  imagePath?: string | null;
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
  description1?: string | null;
  description2?: string | null;
  description3?: string | null;
  pricingRuleHeaderId?: number | null;
  relatedStockId?: number | null;
  relatedProductKey?: string | null;
  isMainRelatedProduct?: boolean;
  erpProjectCode?: string | null;
  approvalStatus?: number;
  isEditing: boolean;
  relatedLines?: QuotationLineFormState[];
  relationQuantity?: number;
}

export interface QuotationExchangeRateFormState {
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

export const DocumentRuleType = {
  Demand: 0,
  Quotation: 1,
  Order: 2,
  FastQuotation: 3,
  Activity: 4,
} as const;

export type DocumentRuleTypeValue = (typeof DocumentRuleType)[keyof typeof DocumentRuleType];

export interface ReportTemplateGetDto {
  id: number;
  ruleType: DocumentRuleTypeValue;
  title: string;
  default?: boolean;
  isActive: boolean;
  templateData?: string | null;
}

export interface GenerateReportPdfRequest {
  templateId: number;
  entityId: number;
}

export const PricingRuleType = {
  Quotation: 2,
} as const;

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

export interface QuotationDetailGetDto {
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

export interface QuotationLineDetailGetDto {
  id: number;
  quotationId: number;
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

export interface QuotationExchangeRateDetailGetDto {
  id: number;
  quotationId: number;
  quotationOfferNo: string | null;
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

export interface QuotationApprovalFlowReportDto {
  quotationId: number;
  quotationOfferNo: string | null;
  hasApprovalRequest: boolean;
  overallStatus: number | null;
  overallStatusName: string | null;
  currentStep: number;
  flowDescription: string | null;
  rejectedReason: string | null;
  steps: ApprovalFlowStepReportDto[];
}

export type QuotationDetailResponse = ApiResponse<QuotationDetailGetDto>;
export type QuotationLineDetailListResponse = ApiResponse<QuotationLineDetailGetDto[]>;
export type QuotationExchangeRateDetailListResponse = ApiResponse<QuotationExchangeRateDetailGetDto[]>;
export type QuotationExchangeRateUpdateResponse = ApiResponse<boolean>;
export type QuotationApprovalFlowReportResponse = ApiResponse<QuotationApprovalFlowReportDto>;

export type WaitingApprovalsResponse =
  ApiResponse<ApprovalActionGetDto[] | PagedResponse<ApprovalActionGetDto>>;
export type ApproveResponse = ApiResponse<boolean>;
export type RejectResponse = ApiResponse<boolean>;
export type QuotationListResponse = PagedApiResponse<QuotationGetDto>;
export type QuotationResponse = ApiResponse<QuotationGetDto>;
export type QuotationBulkCreateResponse = ApiResponse<QuotationGetDto>;
export type PriceRuleResponse = ApiResponse<PricingRuleLineGetDto[]>;
export type UserDiscountLimitResponse = ApiResponse<UserDiscountLimitDto[]>;
export type PriceOfProductResponse = ApiResponse<PriceOfProductDto[]>;
export type ExchangeRateResponse = ApiResponse<ExchangeRateDto[]>;
export type CurrencyOptionsResponse = ApiResponse<CurrencyOptionDto[]>;
export type PaymentTypesResponse = ApiResponse<PaymentTypeDto[]>;
export type DocumentSerialTypesResponse = ApiResponse<DocumentSerialTypeDto[]>;
export type RelatedUsersResponse = ApiResponse<ApprovalScopeUserDto[]>;
export type UserListResponse = ApiResponse<PagedResponse<UserDto>>;

export interface ProjeDto {
  projeKod: string;
  projeAciklama: string | null;
}

export interface SalesTypeGetDto {
  id: number;
  salesType: string;
  name: string;
}

export type { PagedFilter, PagedParams, PagedResponse };
export type { StockGetDto } from "../../stocks/types";
