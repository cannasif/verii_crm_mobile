import { apiClient } from "../../../lib/axios";
import type { ApiResponse } from "../../auth/types";
import type { DocumentSerialTypeDto } from "../types";

interface DocumentSerialTypesResponse {
  success?: boolean;
  data?: DocumentSerialTypeDto[];
  message?: string;
}

export async function getAvailableDocumentSerialTypes(params: {
  customerTypeId: number;
  salesRepId: number;
  ruleType: number;
}): Promise<DocumentSerialTypeDto[]> {
  const { customerTypeId, salesRepId, ruleType } = params;
  const response = await apiClient.get<DocumentSerialTypesResponse>(
    `/api/DocumentSerialType/avaible/customer/${customerTypeId}/salesrep/${salesRepId}/rule/${ruleType}`
  );
  const body = response.data;
  if (body && typeof body === "object" && "data" in body && Array.isArray(body.data)) {
    return body.data;
  }
  if (Array.isArray(body)) {
    return body;
  }
  return [];
}
