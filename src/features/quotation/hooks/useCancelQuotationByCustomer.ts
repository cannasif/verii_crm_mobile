import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateDocumentListQueries } from "../../../lib/documentListQueryInvalidation";
import { useTranslation } from "react-i18next";
import { quotationApi } from "../api";
import { useToastStore } from "../../../store/toast";

export function useCancelQuotationByCustomer() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const { t } = useTranslation();

  return useMutation<boolean, Error, { id: number; reason?: string | null }>({
    mutationFn: ({ id, reason }) => quotationApi.cancelByCustomer(id, reason),
    onSuccess: async (_, variables) => {
      await invalidateDocumentListQueries(queryClient, "quotation");
      queryClient.invalidateQueries({ queryKey: ["quotation", "detail", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["quotation", "approvalFlowReport", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["quotation", "waitingApprovals"] });
      showToast("success", t("common.quotationCancelledByCustomer", "Teklif müşteri tarafından iptal edildi"));
    },
    onError: (error) => {
      showToast(
        "error",
        `${t("common.quotationCancelByCustomerFailed", "Teklif iptal edilemedi")}: ${error.message ?? t("common.unknownError")}`,
        10000
      );
    },
  });
}
