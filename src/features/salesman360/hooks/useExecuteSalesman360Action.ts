import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToastStore } from "../../../store/toast";
import { salesman360Api } from "../api";
import type { ActivityDto, ExecuteRecommendedActionDto } from "../types";

export function useExecuteSalesman360Action(userId: number | undefined) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation<ActivityDto, Error, ExecuteRecommendedActionDto>({
    mutationFn: (payload) => salesman360Api.executeRecommendedAction(userId!, payload),
    onSuccess: () => {
      showToast("success", t("salesman360.actions.executeSuccess"));
      void queryClient.invalidateQueries({ queryKey: ["salesman360", "overview", userId] });
      void queryClient.invalidateQueries({ queryKey: ["salesman360", "cohort", userId] });
    },
    onError: (error) => {
      showToast("error", error.message || t("salesman360.actions.executeError"), 6000);
    },
  });
}
