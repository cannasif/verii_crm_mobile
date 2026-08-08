export { getAvailableDocumentSerialTypes } from "./api/document-serial-type-api";
export { useAvailableDocumentSerialTypes } from "./hooks/useAvailableDocumentSerialTypes";
export { useDocumentSerialAutoFill } from "./hooks/useDocumentSerialAutoFill";
export type { UseDocumentSerialAutoFillParams } from "./hooks/useDocumentSerialAutoFill";
export {
  DocumentSerialRuleType,
  CustomerDocumentSerialDocumentKind,
  type CustomerDocumentSerialDocumentKindValue,
  type CustomerDocumentSerialSuggestionDto,
  type DocumentSerialRuleTypeValue,
  type DocumentSerialTypeDto,
} from "./types/document-serial-type-types";
export {
  getLastDocumentSerialTypeId,
  saveLastDocumentSerialTypeId,
} from "./utils/document-serial-preference-store";
export { formatSuggestedDocumentNumber } from "./utils/format-suggested-document-number";
