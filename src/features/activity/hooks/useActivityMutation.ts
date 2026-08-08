import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { activityApi } from "../api/activity-api";
import { useToastStore } from "../../../store/toast";
import type { CreateActivityDto, UpdateActivityDto, ActivityDto, PagedResponse } from "../types/activity-types";
import { activityQueryKeys, activityRelatedQueryKeys } from "../utils/query-keys";

export function useCreateActivity() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation<ActivityDto, Error, CreateActivityDto>({
    mutationFn: activityApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: activityRelatedQueryKeys.customer360() });
      showToast("success", t("activity.createSuccess"));
    },
    onError: (error) => {
      showToast("error", error.message || t("common.unknownError"));
    },
  });
}

export function useUpdateActivity() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation<ActivityDto, Error, { id: number; data: UpdateActivityDto }, { previousData: ActivityDto | undefined }>({
    mutationFn: ({ id, data }) => activityApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: activityQueryKeys.detail(id) });
      const previousData = queryClient.getQueryData<ActivityDto>(activityQueryKeys.detail(id));
      if (previousData) {
        const optimisticData: ActivityDto = {
          ...previousData,
          ...data,
          reminders: previousData.reminders,
        };
        queryClient.setQueryData<ActivityDto>(activityQueryKeys.detail(id), {
          ...optimisticData,
        });
      }
      return { previousData };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: activityQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: activityQueryKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: activityRelatedQueryKeys.customer360() });
      showToast("success", t("activity.updateSuccess"));
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(activityQueryKeys.detail(variables.id), context.previousData);
      }
      showToast("error", error.message || t("common.unknownError"));
    },
  });
}

export function useDeleteActivity() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation<void, Error, number, { previousData: InfiniteData<PagedResponse<ActivityDto>> | undefined }>({
    mutationFn: activityApi.delete,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: activityQueryKeys.lists() });
      const previousData = queryClient.getQueryData<InfiniteData<PagedResponse<ActivityDto>>>(activityQueryKeys.lists());
      if (previousData) {
        queryClient.setQueryData<InfiniteData<PagedResponse<ActivityDto>>>(
          activityQueryKeys.lists(),
          {
            ...previousData,
            pages: previousData.pages.map((page) => ({
              ...page,
              items: page.items.filter((activity) => activity.id !== id),
              totalCount: page.totalCount - 1,
            })),
          }
        );
      }
      return { previousData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityQueryKeys.lists() });
      showToast("success", t("activity.deleteSuccess"));
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(activityQueryKeys.lists(), context.previousData);
      }
      showToast("error", error.message || t("common.unknownError"));
    },
  });
}
