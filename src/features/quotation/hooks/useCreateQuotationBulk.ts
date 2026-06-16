import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateDocumentListQueries } from "../../../lib/documentListQueryInvalidation";
import { quotationApi } from "../api";
import type { QuotationBulkCreateDto, QuotationGetDto, QuotationNotesDto } from "../types";
import { useToastStore } from "../../../store/toast";
import { useTranslation } from "react-i18next";

function dtoToNotesArray(dto: QuotationNotesDto): string[] {
  const arr: string[] = [];
  for (let i = 1; i <= 15; i++) {
    const v = dto[`note${i}` as keyof QuotationNotesDto];
    if (typeof v === "string" && v.trim()) arr.push(v.trim());
  }
  return arr;
}

export function useCreateQuotationBulk() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const { t } = useTranslation();

  return useMutation<QuotationGetDto, Error, QuotationBulkCreateDto>({
    mutationFn: (data) => quotationApi.createBulk(data),
    onSuccess: async (data, variables) => {
      const notesDto = variables.quotationNotes;
      if (notesDto) {
        const notesArray = dtoToNotesArray(notesDto);
        if (notesArray.length > 0) {
          try {
            await quotationApi.updateQuotationNotesList(data.id, { notes: notesArray });
          } catch {
          }
        }
      }
      await invalidateDocumentListQueries(queryClient, "quotation");
    },
    onError: (error) => {
      showToast(
        "error",
        `${t("common.quotationCreateFailed")}: ${error.message || t("common.quotationCreateFailedGeneric")}`,
        10000
      );
    },
  });
}
