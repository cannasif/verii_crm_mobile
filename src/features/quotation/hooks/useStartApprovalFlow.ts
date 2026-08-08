import { quotationQueryKeys } from "../utils/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateDocumentListQueries } from "../../../lib/documentListQueryInvalidation";
import { quotationApi } from "../api/quotation-api";
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
    onSuccess: async (_, variables) => {
      await invalidateDocumentListQueries(queryClient, "quotation");
      queryClient.invalidateQueries({ queryKey: quotationQueryKeys.detail(variables.entityId) });
      queryClient.invalidateQueries({ queryKey: quotationQueryKeys.lines(variables.entityId) });
      queryClient.invalidateQueries({ queryKey: quotationQueryKeys.exchangeRates(variables.entityId) });
      queryClient.invalidateQueries({ queryKey: quotationQueryKeys.waitingApprovals() });
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
