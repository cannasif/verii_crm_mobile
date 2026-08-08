import { demandQueryKeys } from "../utils/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { demandApi } from "../api/demand-api";
import { useToastStore } from "../../../store/toast";
import { useTranslation } from "react-i18next";

export function useCreateRevisionOfDemand() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: (demandId: number) => demandApi.createRevision(demandId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: demandQueryKeys.lists() });
      showToast("success", t("demand.revisionSuccess"));
      router.push(`/(tabs)/sales/demands/${data.id}`);
    },
    onError: (error: Error) => {
      showToast("error", error.message || t("demand.revisionError"));
    },
  });
}
