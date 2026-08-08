import { quotationQueryKeys } from "../utils/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { quotationApi } from "../api/quotation-api";
import { useToastStore } from "../../../store/toast";
import { useTranslation } from "react-i18next";

export function useCreateRevisionOfQuotation() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: (quotationId: number) => quotationApi.createRevision(quotationId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: quotationQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: quotationQueryKeys.detailRoot() });
      showToast("success", t("quotation.revisionSuccess"));
      router.push(`/(tabs)/sales/quotations/${data.id}`);
    },
    onError: (error: Error) => {
      showToast("error", error.message || t("quotation.revisionError"));
    },
  });
}
