export interface SalesDocumentLineFormState {
  id: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountRate1: number;
  discountRate2: number;
  discountRate3: number;
  vatRate: number;
  vatAmount: number;
  lineTotal: number;
  lineGrandTotal: number;
  description1?: string | null;
  description2?: string | null;
  description3?: string | null;
  profilDefinitionId?: number | null;
  demirDefinitionId?: number | null;
  vidaDefinitionId?: number | null;
  vidaDefinitionName?: string | null;
  baskiDefinitionId?: number | null;
  baskiDefinitionName?: string | null;
  baskiAciklama?: string | null;
  imagePath?: string | null;
  approvalStatus?: number;
  relatedLines?: SalesDocumentLineFormState[];
}

export type SalesDocumentLineTranslationPrefix = "quotation" | "order" | "demand";
