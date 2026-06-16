import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateDocumentListQueries } from "../../../lib/documentListQueryInvalidation";
import { useTranslation } from "react-i18next";
import { demandApi } from "../api";
import { useToastStore } from "../../../store/toast";

export function useCancelDemandByCustomer() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const { t } = useTranslation();

  return useMutation<boolean, Error, { id: number; reason?: string | null }>({
    mutationFn: ({ id, reason }) => demandApi.cancelByCustomer(id, reason),
    onSuccess: async (_, variables) => {
      await invalidateDocumentListQueries(queryClient, "demand");
      queryClient.invalidateQueries({ queryKey: ["demand", "detail", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["demand", "approvalFlowReport", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["demand", "waitingApprovals"] });
      showToast("success", t("common.demandCancelledByCustomer", "Talep müşteri tarafından iptal edildi"));
    },
    onError: (error) => {
      showToast(
        "error",
        `${t("common.demandCancelByCustomerFailed", "Talep iptal edilemedi")}: ${error.message ?? t("common.unknownError")}`,
        10000
      );
    },
  });
}
