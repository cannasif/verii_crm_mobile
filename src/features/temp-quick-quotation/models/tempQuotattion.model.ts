import type { ApiResponse } from "../../auth/types/auth-types";
import type { PagedApiResponse, PagedFilter, PagedParams, PagedResponse } from "../../customer/types/common";

export interface TempQuickQuotationBaseDto {
  id: number;
  createdDate: string;
  updatedDate?: string | null;
  deletedDate?: string | null;
  isDeleted: boolean;
  createdByFullUser?: string | null;
  updatedByFullUser?: string | null;
  deletedByFullUser?: string | null;
}

export interface TempQuotattionGetDto extends TempQuickQuotationBaseDto {
  customerId: number;
  customerName?: string | null;
  offerDate: string;
  currencyCode: string;
  exchangeRate: number;
  discountRate1: number;
  discountRate2: number;
  discountRate3: number;
  isApproved: boolean;
  approvedDate?: string | null;
  description: string;
}

export interface TempQuotattionCreateDto {
  customerId: number;
  currencyCode: string;
  exchangeRate: number;
  discountRate1: number;
  discountRate2: number;
  discountRate3: number;
  description: string;
}

export interface TempQuotattionUpdateDto extends TempQuotattionCreateDto {}

export interface TempQuotattionLineGetDto extends TempQuickQuotationBaseDto {
  tempQuotattionId: number;
  productCode: string;
  productName: string;
  imagePath: string;
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
  description: string;
}

export interface TempQuotattionLineCreateDto {
  tempQuotattionId: number;
  productCode: string;
  productName: string;
  imagePath: string;
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
  description: string;
}

export interface TempQuotattionLineUpdateDto {
  productCode: string;
  productName: string;
  imagePath: string;
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
  description: string;
}

export interface TempQuotattionExchangeLineGetDto extends TempQuickQuotationBaseDto {
  tempQuotattionId: number;
  currency: string;
  exchangeRate: number;
  exchangeRateDate: string;
  isManual: boolean;
}

export interface TempQuotattionExchangeLineCreateDto {
  tempQuotattionId: number;
  currency: string;
  exchangeRate: number;
  exchangeRateDate: string;
  isManual: boolean;
}

export interface TempQuotattionExchangeLineUpdateDto {
  currency: string;
  exchangeRate: number;
  exchangeRateDate: string;
  isManual: boolean;
}

export interface TempQuickQuotationPagedParams extends PagedParams {
  filters?: PagedFilter[];
}

export type TempQuotattionListResponse = PagedApiResponse<TempQuotattionGetDto>;
export type TempQuotattionResponse = ApiResponse<TempQuotattionGetDto>;
export type TempQuotattionDeleteResponse = ApiResponse<unknown>;

export type TempQuotattionLineListResponse = ApiResponse<TempQuotattionLineGetDto[]>;
export type TempQuotattionLineResponse = ApiResponse<TempQuotattionLineGetDto>;
export type TempQuotattionLineDeleteResponse = ApiResponse<unknown>;

export type TempQuotattionExchangeLineListResponse = ApiResponse<TempQuotattionExchangeLineGetDto[]>;
export type TempQuotattionExchangeLineResponse = ApiResponse<TempQuotattionExchangeLineGetDto>;
export type TempQuotattionExchangeLineDeleteResponse = ApiResponse<unknown>;

export interface TempQuickQuotationRepository {
  getList(params?: TempQuickQuotationPagedParams): Promise<PagedResponse<TempQuotattionGetDto>>;
  getById(id: number): Promise<TempQuotattionGetDto>;
  create(payload: TempQuotattionCreateDto): Promise<TempQuotattionGetDto>;
  update(id: number, payload: TempQuotattionUpdateDto): Promise<TempQuotattionGetDto>;
  setApproved(id: number): Promise<TempQuotattionGetDto>;
  remove(id: number): Promise<void>;

  getLinesByHeaderId(tempQuotattionId: number): Promise<TempQuotattionLineGetDto[]>;
  getLineById(lineId: number): Promise<TempQuotattionLineGetDto>;
  createLine(payload: TempQuotattionLineCreateDto): Promise<TempQuotattionLineGetDto>;
  createLines(payload: TempQuotattionLineCreateDto[]): Promise<TempQuotattionLineGetDto[]>;
  updateLine(lineId: number, payload: TempQuotattionLineUpdateDto): Promise<TempQuotattionLineGetDto>;
  removeLine(lineId: number): Promise<void>;

  getExchangeLinesByHeaderId(tempQuotattionId: number): Promise<TempQuotattionExchangeLineGetDto[]>;
  getExchangeLineById(exchangeLineId: number): Promise<TempQuotattionExchangeLineGetDto>;
  createExchangeLine(payload: TempQuotattionExchangeLineCreateDto): Promise<TempQuotattionExchangeLineGetDto>;
  updateExchangeLine(
    exchangeLineId: number,
    payload: TempQuotattionExchangeLineUpdateDto
  ): Promise<TempQuotattionExchangeLineGetDto>;
  removeExchangeLine(exchangeLineId: number): Promise<void>;

  revise(id: number, payload: TempQuotattionUpdateDto): Promise<TempQuotattionGetDto>;
  approveAndConvertToQuotation(id: number): Promise<TempQuotattionGetDto>;
}
