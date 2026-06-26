import { apiClient } from "../../lib/axios";
import type { ApiResponse } from "../auth/types";
import type {
  DocumentFieldLabelDocumentType,
  DocumentFieldLabelDto,
  DocumentFieldLabelScope,
} from "./types";

export async function getDocumentFieldLabels(params?: {
  documentType?: DocumentFieldLabelDocumentType;
  scope?: DocumentFieldLabelScope;
}): Promise<DocumentFieldLabelDto[]> {
  const response = await apiClient.get<ApiResponse<DocumentFieldLabelDto[]>>("/api/DocumentFieldLabels", {
    params,
  });

  if (response.data.success && response.data.data) {
    return response.data.data;
  }

  throw new Error(response.data.message || "Belge alan başlıkları yüklenemedi.");
}
