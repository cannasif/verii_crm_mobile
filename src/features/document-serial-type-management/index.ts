export { getAvailableDocumentSerialTypes } from "./api/documentSerialTypeApi";
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
} from "./types";
export {
  getLastDocumentSerialTypeId,
  saveLastDocumentSerialTypeId,
} from "./utils/documentSerialPreferenceStore";
export { formatSuggestedDocumentNumber } from "./utils/formatSuggestedDocumentNumber";
