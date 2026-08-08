import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "../../../hooks/useToast";
import { tempQuickQuotationRepository } from "../repositories/tempQuotattion.repository";
import { tempQuickQuotationQueryKeys } from "../utils/query-keys";

export function useTempQuickQuotationConvert() {
  const { t } = useTranslation();
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();
  const [convertingId, setConvertingId] = useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: (id: number) =>
      tempQuickQuotationRepository.approveAndConvertToQuotation(id),
    onMutate: (id) => {
      setConvertingId(id);
    },
    onSettled: () => {
      setConvertingId(null);
    },
    onSuccess: () => {
      showSuccess(t("tempQuickQuotation.convertSuccess"));
      void queryClient.invalidateQueries({
        queryKey: tempQuickQuotationQueryKeys.listPrefix(),
      });
    },
    onError: (error) => {
      showError(
        error instanceof Error ? error.message : t("tempQuickQuotation.convertError")
      );
    },
  });

  return {
    convert: mutation.mutate,
    convertingId,
    isConverting: mutation.isPending,
  };
}
