import { orderQueryKeys } from "../utils/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateDocumentListQueries } from "../../../lib/documentListQueryInvalidation";
import { orderApi } from "../api/order-api";
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
    mutationFn: (data) => orderApi.startApprovalFlow(data),
    onSuccess: async (_, variables) => {
      await invalidateDocumentListQueries(queryClient, "order");
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.detail(variables.entityId) });
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.waitingApprovals() });
      showToast("success", t("order.sendForApprovalSuccess"));
    },
    onError: (error: Error) => {
      showToast("error", error.message || t("order.sendForApprovalError"), 10000);
    },
  });
}
