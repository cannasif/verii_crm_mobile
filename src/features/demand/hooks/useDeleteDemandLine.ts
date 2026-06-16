import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateDocumentListAndDetailHeader } from "../../../lib/documentListQueryInvalidation";
import { demandApi } from "../api";
import { useToastStore } from "../../../store/toast";
import { useTranslation } from "react-i18next";

export function useDeleteDemandLine() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const { t } = useTranslation();

  return useMutation<void, Error, { demandId: number; lineId: number }>({
    mutationFn: ({ lineId }) => demandApi.deleteDemandLine(lineId),
    onSuccess: async (_, { demandId }) => {
      await invalidateDocumentListAndDetailHeader(queryClient, "demand", demandId);
      queryClient.invalidateQueries({ queryKey: ["demand", "detail", demandId] });
      queryClient.invalidateQueries({ queryKey: ["demand", "detail", "lines", demandId] });
      showToast("success", t("common.lineDeleted"));
    },
    onError: (error) => {
      showToast(
        "error",
        `${t("common.lineDeleteFailed")}: ${error.message ?? t("common.unknownError")}`,
        10000
      );
    },
  });
}
