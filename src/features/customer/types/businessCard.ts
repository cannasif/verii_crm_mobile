export interface AddressParts {
  neighborhood: string | null;
  street: string | null;
  avenue: string | null;
  boulevard: string | null;
  sitePlaza: string | null;
  block: string | null;
  buildingNo: string | null;
  floor: string | null;
  apartment: string | null;
  postalCode: string | null;
  district: string | null;
  province: string | null;
  country: string | null;
}

export interface BusinessCardOcrResult {
  customerName?: string;
  contactNameAndSurname?: string;
  title?: string;
  countryName?: string;
  cityName?: string;
  districtName?: string;
  phone1?: string;
  phone2?: string;
  email?: string;
  address?: string;
  website?: string;
  notes?: string;
  imageUri?: string;
  previewUri?: string;
  review?: BusinessCardReviewSummary;
  languageProfile?: BusinessCardResultLanguageProfile;
  translationMeta?: BusinessCardTranslationMeta;
}

export interface BusinessCardResultLanguageProfile {
  dominantScript: "latin" | "cyrillic" | "mixed" | "unknown";
  suggestedLocale: "tr" | "en" | "de" | "ru" | "intl";
  confidence: number;
  recognizedLanguages: string[];
}

export interface BusinessCardTranslationMeta {
  targetLocale: "tr";
  sourceLocale: BusinessCardResultLanguageProfile["suggestedLocale"];
  changedFields: Array<"title" | "address" | "notes" | "countryName" | "cityName" | "districtName">;
  translated: boolean;
}

export interface BusinessCardReviewFlag {
  field:
    | "general"
    | "customerName"
    | "contactNameAndSurname"
    | "title"
    | "phone1"
    | "phone2"
    | "email"
    | "website"
    | "address";
  reason: string;
  severity: "low" | "medium" | "high";
}

export interface BusinessCardReviewSummary {
  overallConfidence: number;
  fieldConfidence: Partial<Record<BusinessCardReviewFlag["field"], number>>;
  flags: BusinessCardReviewFlag[];
}

export interface BusinessCardExtractionSocial {
  linkedin: string | null;
  instagram: string | null;
  x: string | null;
  facebook: string | null;
}

export interface BusinessCardExtraction {
  contactNameAndSurname: string | null;
  name: string | null;
  title: string | null;
  company: string | null;
  phones: string[];
  emails: string[];
  website: string | null;
  address: string | null;
  addressParts: AddressParts;
  social: BusinessCardExtractionSocial;
  notes: string[];
}
