export interface StockDetailDto {
  id: number;
  stockId: number;
  stockName?: string;
  htmlDescription?: string;
  technicalSpecsJson?: string;
  createdDate?: string;
  updatedDate?: string;
  deletedDate?: string;
  isDeleted?: boolean;
  createdByFullUser?: string;
  updatedByFullUser?: string;
  deletedByFullUser?: string;
}

export interface StockGetDto {
  id: number;
  erpStockCode: string;
  stockName: string;
  unit?: string;
  balance?: number | null;
  balanceText?: string | null;
  ureticiKodu?: string;
  branchCode: number;
  stockImages?: StockImageDto[];
  parentRelations?: StockRelationDto[];
  grupKodu?: string;
  grupAdi?: string;
  kod1?: string;
  kod1Adi?: string;
  kod2?: string;
  kod2Adi?: string;
  kod3?: string;
  kod3Adi?: string;
  kod4?: string;
  kod4Adi?: string;
  kod5?: string;
  kod5Adi?: string;
  stockDetail?: StockDetailDto;
  createdDate?: string;
  updatedDate?: string;
  createdByFullUser?: string;
  updatedByFullUser?: string;
  deletedByFullUser?: string;
  deletedDate?: string;
  isDeleted?: boolean;
}

export interface StockImageDto {
  id: number;
  stockId: number;
  filePath: string;
  altText?: string;
  isPrimary: boolean;
  sortOrder: number;
  stockName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockRelationDto {
  id: number;
  stockId: number;
  relatedStockId: number;
  relatedStockName?: string;
  relatedStockCode?: string;
  quantity: number;
  description?: string;
  isMandatory: boolean;
}

export interface StockRelationCreateDto {
  stockId: number;
  relatedStockId: number;
  quantity: number;
  description?: string;
  isMandatory?: boolean;
}

export interface StockGroupDto {
  isletmeKodu: number;
  subeKodu: number;
  grupKodu?: string;
  grupAdi?: string;
}
