import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToastStore } from "../../../store/toast";
import { salesman360Api } from "../api/salesman360-api";
import type { ActivityDto, ExecuteRecommendedActionDto } from "../types/salesman360-types";
import { salesman360QueryKeys } from "../utils/query-keys";

export function useExecuteSalesman360Action(userId: number | undefined) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation<ActivityDto, Error, ExecuteRecommendedActionDto>({
    mutationFn: (payload) => salesman360Api.executeRecommendedAction(userId!, payload),
    onSuccess: () => {
      showToast("success", t("salesman360.actions.executeSuccess"));
      void queryClient.invalidateQueries({ queryKey: salesman360QueryKeys.overviewByUser(userId) });
      void queryClient.invalidateQueries({ queryKey: salesman360QueryKeys.cohortByUser(userId) });
    },
    onError: (error) => {
      showToast("error", error.message || t("salesman360.actions.executeError"), 6000);
    },
  });
}
