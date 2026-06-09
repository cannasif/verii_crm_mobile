import { useMutation, useQueryClient } from "@tanstack/react-query";
import { quotationApi } from "../api";
import { useToastStore } from "../../../store/toast";
import { useTranslation } from "react-i18next";

export type StartApprovalFlowPayload = {
  entityId: number;
  documentType: number;
  totalAmount: number;
};

export function useStartApprovalFlow() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const { t } = useTranslation();

  return useMutation<boolean, Error, StartApprovalFlowPayload>({
    mutationFn: (data) => quotationApi.startApprovalFlow(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quotation", "list"] });
      queryClient.invalidateQueries({ queryKey: ["quotation", "detail", variables.entityId] });
      queryClient.invalidateQueries({ queryKey: ["quotation", "detail", "lines", variables.entityId] });
      queryClient.invalidateQueries({ queryKey: ["quotation", "detail", "exchangeRates", variables.entityId] });
      queryClient.invalidateQueries({ queryKey: ["quotation", "waitingApprovals"] });
      showToast("success", t("common.quotationApprovalFlowStarted"));
    },
    onError: (error) => {
      showToast(
        "error",
        `${t("common.approvalFlowStartError")}: ${error.message ?? t("common.unknownError")}`,
        10000
      );
    },
  });
}
