import { demandQueryKeys } from "../utils/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { demandApi } from "../api/demand-api";
import type { ApproveActionDto } from "../types/demand-types";
import { useToastStore } from "../../../store/toast";
import { useTranslation } from "react-i18next";

export function useApproveAction() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: (data: ApproveActionDto) => demandApi.approve(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: demandQueryKeys.waitingApprovals() });
      queryClient.invalidateQueries({ queryKey: demandQueryKeys.all() });
      showToast("success", t("demand.approveSuccess"));
    },
    onError: (error: Error) => {
      showToast("error", error.message || t("demand.approveError"));
    },
  });
}
