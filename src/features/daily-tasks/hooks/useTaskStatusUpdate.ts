import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { dailyTasksApi } from "../api/daily-tasks-api";
import { useToastStore } from "../../../store/toast";
import type { ActivityDto } from "../../activity/types/activity-types";
import { dailyTaskQueryKeys, dailyTaskRelatedQueryKeys } from "../utils/query-keys";

interface UpdateStatusParams {
  id: number;
  status: string;
  isCompleted: boolean;
}

export function useTaskStatusUpdate() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation<ActivityDto, Error, UpdateStatusParams>({
    mutationFn: ({ id, status, isCompleted }) =>
      dailyTasksApi.updateStatus(id, status, isCompleted),
    onMutate: async ({ id, status, isCompleted }) => {
      await queryClient.cancelQueries({ queryKey: dailyTaskQueryKeys.all() });
      await queryClient.cancelQueries({ queryKey: dailyTaskRelatedQueryKeys.activityLists() });

      return { id, status, isCompleted };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyTaskQueryKeys.all() });
      queryClient.invalidateQueries({ queryKey: dailyTaskRelatedQueryKeys.activityLists() });
      queryClient.invalidateQueries({ queryKey: dailyTaskRelatedQueryKeys.activityDetails() });
      showToast("success", t("dailyTasks.statusUpdated"));
    },
    onError: (error) => {
      showToast("error", error.message || t("common.unknownError"));
    },
  });
}

export function useStartTask() {
  const mutation = useTaskStatusUpdate();

  return {
    ...mutation,
    startTask: (id: number) =>
      mutation.mutateAsync({ id, status: "InProgress", isCompleted: false }),
  };
}

export function useCompleteTask() {
  const mutation = useTaskStatusUpdate();

  return {
    ...mutation,
    completeTask: (id: number) =>
      mutation.mutateAsync({ id, status: "Completed", isCompleted: true }),
  };
}

export function useHoldTask() {
  const mutation = useTaskStatusUpdate();

  return {
    ...mutation,
    holdTask: (id: number) =>
      mutation.mutateAsync({ id, status: "Postponed", isCompleted: false }),
  };
}
