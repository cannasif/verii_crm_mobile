import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateDocumentListAndDetailHeader } from "../../../lib/documentListQueryInvalidation";
import { quotationApi } from "../api";
import type { QuotationLineUpdateDto, QuotationLineDetailGetDto } from "../types";
import { useToastStore } from "../../../store/toast";
import { useTranslation } from "react-i18next";

export function useUpdateQuotationLines() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const { t } = useTranslation();

  return useMutation<
    QuotationLineDetailGetDto[],
    Error,
    { quotationId: number; body: QuotationLineUpdateDto[] }
  >({
    mutationFn: ({ body }) => quotationApi.updateQuotationLines(body),
    onSuccess: async (_, { quotationId }) => {
      await invalidateDocumentListAndDetailHeader(queryClient, "quotation", quotationId);
      queryClient.invalidateQueries({ queryKey: ["quotation", "detail", "lines", quotationId] });
      showToast("success", t("common.rowsUpdated"));
    },
    onError: (error) => {
      showToast(
        "error",
        `${t("common.quotationRowsUpdateFailed")}: ${error.message ?? t("common.unknownError")}`,
        10000
      );
    },
  });
}
