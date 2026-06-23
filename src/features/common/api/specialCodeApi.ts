import { apiClient } from "../../../lib/axios";
import type { ApiResponse } from "../../auth/types";
import type { SpecialCodeDto } from "../types/specialCode";

type SpecialCodeListResponse = ApiResponse<SpecialCodeDto[]>;

export const specialCodeApi = {
  async getSpecialCodes(
    tableType: 1 | 2,
    specialCode?: string
  ): Promise<SpecialCodeDto[]> {
    const params = new URLSearchParams({ tableType: String(tableType) });
    const normalizedSpecialCode = specialCode?.trim();

    if (normalizedSpecialCode) {
      params.set("specialCode", normalizedSpecialCode);
    }

    const response = await apiClient.get<SpecialCodeListResponse>(
      `/api/NetsisRead/getSpecialCodes?${params.toString()}`
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(
        response.data.message ||
          response.data.exceptionMessage ||
          "Özel kodlar getirilemedi"
      );
    }

    return response.data.data;
  },
};
