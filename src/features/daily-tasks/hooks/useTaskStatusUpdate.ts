import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { dailyTasksApi } from "../api";
import { useToastStore } from "../../../store/toast";
import type { ActivityDto } from "../../activity/types/activity-types";

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
      await queryClient.cancelQueries({ queryKey: ["dailyTasks"] });
      await queryClient.cancelQueries({ queryKey: ["activity", "list"] });

      return { id, status, isCompleted };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyTasks"] });
      queryClient.invalidateQueries({ queryKey: ["activity", "list"] });
      queryClient.invalidateQueries({ queryKey: ["activity", "detail"] });
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
