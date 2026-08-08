export * from "./types/common";
export * from "./types/lookups";
export * from "./types/customer";
export * from "./types/business-card";
export { useCountries, useCities, useDistricts, useCustomerTypes, useTitles } from "./hooks/useLookups";
export { useCustomers } from "./hooks/useCustomers";
export { useCustomerScopeAccess } from "./hooks/useCustomerScopeAccess";
export { useCustomer } from "./hooks/useCustomer";
export { useCustomerImages } from "./hooks/useCustomerImages";
export {
  useCreateCustomer,
  useCreateCustomerFromMobile,
  useUpdateCustomer,
  useDeleteCustomer,
  useUploadCustomerImage,
} from "./hooks/useCustomerMutation";
export { useUpdateCustomerLocation } from "./hooks/useUpdateCustomerLocation";
export { useBusinessCardScan } from "./hooks/useBusinessCardScan";
export { useBusinessCardPotentialMatches } from "./hooks/useBusinessCardPotentialMatches";
export { useQrCustomerScan } from "./hooks/useQrCustomerScan";
export * from "./components";
export * from "./screens";
export { customerSchema, createCustomerSchema, type CustomerFormData } from "./schemas/customer-schema";
export {
  BusinessCardExtractionSchema,
  repairJsonString,
  sanitizeAddress,
  sanitizePhones,
  validateAndNormalizeBusinessCardExtraction,
  toBusinessCardOcrResult,
} from "./schemas/business-card-schema";
