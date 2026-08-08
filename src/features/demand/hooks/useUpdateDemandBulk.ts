import { demandQueryKeys } from "../utils/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateDocumentListQueries } from "../../../lib/documentListQueryInvalidation";
import { demandApi } from "../api/demand-api";
import type { DemandBulkCreateDto, DemandGetDto } from "../types/demand-types";
import { useToastStore } from "../../../store/toast";
import { useTranslation } from "react-i18next";

export function useUpdateDemandBulk() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const { t } = useTranslation();

  return useMutation<
    DemandGetDto,
    Error,
    { id: number; data: DemandBulkCreateDto }
  >({
    mutationFn: ({ id, data }) => demandApi.updateBulk(id, data),
    onSuccess: async (_, { id }) => {
      await invalidateDocumentListQueries(queryClient, "demand");
      queryClient.invalidateQueries({ queryKey: demandQueryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: demandQueryKeys.lines(id) });
      queryClient.invalidateQueries({ queryKey: demandQueryKeys.exchangeRates(id) });
      showToast("success", t("common.demandUpdated"));
    },
    onError: (error) => {
      showToast(
        "error",
        `${t("common.demandUpdateFailed")}: ${error.message ?? t("common.unknownError")}`,
        10000
      );
    },
  });
}
