import { quotationQueryKeys } from "../utils/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { quotationApi } from "../api/quotation-api";
import type { UpdateQuotationNotesListDto } from "../types/quotation-types";
import { useToastStore } from "../../../store/toast";
import { useTranslation } from "react-i18next";

export function useUpdateQuotationNotes() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const { t } = useTranslation();

  return useMutation<void, Error, { quotationId: number; data: UpdateQuotationNotesListDto }>({
    mutationFn: ({ quotationId, data }) => quotationApi.updateQuotationNotesList(quotationId, data),
    onSuccess: (_, { quotationId }) => {
      queryClient.invalidateQueries({ queryKey: quotationQueryKeys.notes(quotationId) });
      showToast("success", t("common.quotationNotesSaved"));
    },
    onError: (error) => {
      showToast("error", `${t("common.quotationNotesSaveFailed")}: ${error.message ?? t("common.unknownError")}`, 5000);
    },
  });
}
