import type { ActivityDto } from "../../activity/types/activity-types";

export type { ActivityDto };

export type TaskStatus = "Scheduled" | "InProgress" | "Completed" | "Cancelled" | "Postponed";

export interface DailyTaskFilter {
  startDate: string;
  endDate: string;
  assignedUserId?: number;
  status?: TaskStatus;
}

export interface TasksByDate {
  [date: string]: ActivityDto[];
}

export type ViewMode = "weekly" | "daily" | "calendar";

export interface MarkedDate {
  marked?: boolean;
  dotColor?: string;
  selected?: boolean;
  selectedColor?: string;
}

export interface MarkedDates {
  [date: string]: MarkedDate;
}

export interface CalendarViewProps {
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  onAddForDate: (date: string) => void;
}

export interface WeeklyViewProps {
  onCreateTask: (startDateTime: string, endDateTime: string) => void;
}

export interface DailyViewProps {
  onCreateTask: (date: string) => void;
}
