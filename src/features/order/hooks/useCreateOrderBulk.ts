import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateDocumentListQueries } from "../../../lib/documentListQueryInvalidation";
import { useRouter } from "expo-router";
import { orderApi } from "../api";
import type { OrderBulkCreateDto, OrderGetDto } from "../types";
import { useToastStore } from "../../../store/toast";
import { useTranslation } from "react-i18next";

export function useCreateOrderBulk() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const showToast = useToastStore((state) => state.showToast);
  const { t } = useTranslation();

  return useMutation<OrderGetDto, Error, OrderBulkCreateDto>({
    mutationFn: (data) => orderApi.createBulk(data),
    onSuccess: async (data) => {
      await invalidateDocumentListQueries(queryClient, "order");
      showToast("success", t("order.createSuccess"));
      router.push(`/(tabs)/sales/orders/${data.id}`);
    },
    onError: (error: Error) => {
      showToast("error", error.message || t("order.createError"), 10000);
    },
  });
}
