import { quotationQueryKeys } from "../utils/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { quotationApi } from "../api/quotation-api";
import type { RejectActionDto } from "../types/quotation-types";
import { useToastStore } from "../../../store/toast";
import { useTranslation } from "react-i18next";

export function useRejectAction() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: (data: RejectActionDto) => quotationApi.reject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationQueryKeys.waitingApprovals() });
      queryClient.invalidateQueries({ queryKey: quotationQueryKeys.all() });
      showToast("success", t("quotation.rejectSuccess"));
    },
    onError: (error: Error) => {
      showToast("error", error.message || t("quotation.rejectError"));
    },
  });
}
