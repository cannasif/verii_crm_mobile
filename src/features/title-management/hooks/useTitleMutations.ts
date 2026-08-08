import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { titleApi } from "../api/title-api";
import { useToastStore } from "../../../store/toast";
import type { CreateTitleDto, UpdateTitleDto, TitleDto, PagedResponse } from "../types";
import { titleQueryKeys } from "../utils/query-keys";

export function useCreateTitle() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation<TitleDto, Error, CreateTitleDto>({
    mutationFn: titleApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: titleQueryKeys.listPrefix() });
      showToast("success", t("titleManagement.createSuccess"));
    },
    onError: (error) => {
      showToast("error", error.message || t("common.unknownError"));
    },
  });
}

export function useUpdateTitle() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation<TitleDto, Error, { id: number; data: UpdateTitleDto }, { previousData: TitleDto | undefined }>({
    mutationFn: ({ id, data }) => titleApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: titleQueryKeys.detail(id) });
      const previousData = queryClient.getQueryData<TitleDto>(titleQueryKeys.detail(id));
      if (previousData) {
        queryClient.setQueryData<TitleDto>(titleQueryKeys.detail(id), {
          ...previousData,
          ...data,
        });
      }
      return { previousData };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: titleQueryKeys.listPrefix() });
      queryClient.invalidateQueries({ queryKey: titleQueryKeys.detail(variables.id) });
      showToast("success", t("titleManagement.updateSuccess"));
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(titleQueryKeys.detail(variables.id), context.previousData);
      }
      showToast("error", error.message || t("common.unknownError"));
    },
  });
}

export function useDeleteTitle() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation<void, Error, number, { previousData: InfiniteData<PagedResponse<TitleDto>> | undefined }>({
    mutationFn: titleApi.delete,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: titleQueryKeys.listPrefix() });
      const previousData = queryClient.getQueryData<InfiniteData<PagedResponse<TitleDto>>>(
        titleQueryKeys.listPrefix()
      );
      if (previousData) {
        queryClient.setQueryData<InfiniteData<PagedResponse<TitleDto>>>(titleQueryKeys.listPrefix(), {
          ...previousData,
          pages: previousData.pages.map((page) => ({
            ...page,
            items: page.items.filter((title) => title.id !== id),
            totalCount: page.totalCount - 1,
          })),
        });
      }
      return { previousData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: titleQueryKeys.listPrefix() });
      showToast("success", t("titleManagement.deleteSuccess"));
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(titleQueryKeys.listPrefix(), context.previousData);
      }
      showToast("error", error.message || t("common.unknownError"));
    },
  });
}
