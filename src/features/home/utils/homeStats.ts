import type { ActivityDto } from "../../activity/types";

export function getTodayRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  return {
    startDate: startOfDay.toISOString(),
    endDate: endOfDay.toISOString(),
  };
}

export function countPendingTasksForToday(tasks: ActivityDto[] | undefined): number {
  if (!tasks?.length) return 0;
  return tasks.filter((task) => {
    if (task.isCompleted === true) return false;
    const s = task.status;
    if (s === 1 || s === "1") return false;
    const low = String(s ?? "").toLowerCase().replace(/\s+/g, "");
    if (low === "completed" || low === "cancelled" || low === "canceled") return false;
    return true;
  }).length;
}
