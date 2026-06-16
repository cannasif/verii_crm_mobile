import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateDocumentListAndDetailHeader } from "../../../lib/documentListQueryInvalidation";
import { quotationApi } from "../api";
import { useToastStore } from "../../../store/toast";
import { useTranslation } from "react-i18next";

export function useDeleteQuotationLine() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const { t } = useTranslation();

  return useMutation<void, Error, { quotationId: number; lineId: number }>({
    mutationFn: ({ lineId }) => quotationApi.deleteQuotationLine(lineId),
    onSuccess: async (_, { quotationId }) => {
      await invalidateDocumentListAndDetailHeader(queryClient, "quotation", quotationId);
      queryClient.invalidateQueries({ queryKey: ["quotation", "detail", quotationId] });
      queryClient.invalidateQueries({ queryKey: ["quotation", "detail", "lines", quotationId] });
      showToast("success", t("common.lineDeleted"));
    },
    onError: (error) => {
      showToast(
        "error",
        `${t("common.lineDeleteFailed")}: ${error.message ?? t("common.unknownError")}`,
        10000
      );
    },
  });
}
