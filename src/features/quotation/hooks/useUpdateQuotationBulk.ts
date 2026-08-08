import { quotationQueryKeys } from "../utils/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateDocumentListQueries } from "../../../lib/documentListQueryInvalidation";
import { quotationApi } from "../api/quotation-api";
import type { QuotationBulkCreateDto, QuotationGetDto } from "../types/quotation-types";
import { useToastStore } from "../../../store/toast";
import { useTranslation } from "react-i18next";

export function useUpdateQuotationBulk() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const { t } = useTranslation();

  return useMutation<
    QuotationGetDto,
    Error,
    { id: number; data: QuotationBulkCreateDto }
  >({
    mutationFn: ({ id, data }) => quotationApi.updateBulk(id, data),
    onSuccess: async (_, { id }) => {
      await invalidateDocumentListQueries(queryClient, "quotation");
      queryClient.invalidateQueries({ queryKey: quotationQueryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: quotationQueryKeys.lines(id) });
      queryClient.invalidateQueries({ queryKey: quotationQueryKeys.exchangeRates(id) });
      showToast("success", t("common.quotationUpdated"));
    },
    onError: (error) => {
      showToast(
        "error",
        `${t("common.quotationUpdateFailed")}: ${error.message ?? t("common.unknownError")}`,
        10000
      );
    },
  });
}
