import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateDocumentListQueries } from "../../../lib/documentListQueryInvalidation";
import { demandApi } from "../api";
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
    mutationFn: (data) => demandApi.startApprovalFlow(data),
    onSuccess: async (_, variables) => {
      await invalidateDocumentListQueries(queryClient, "demand");
      queryClient.invalidateQueries({ queryKey: ["demand", "detail", variables.entityId] });
      queryClient.invalidateQueries({ queryKey: ["demand", "waitingApprovals"] });
      showToast("success", t("common.demandApprovalFlowStarted"));
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
