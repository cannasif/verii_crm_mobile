import type { User } from "../../auth/types";

export type { User };

export interface Module {
  id: string;
  key: string;
  icon: string;
  color: string;
  route: string;
  permissionCodes?: string[];
}

export interface ActivityItem {
  id: string;
  type: "receiving" | "inventory" | "transfer" | "shipping" | "putaway" | "picking";
  title: string;
  description: string;
  timestamp: string;
  status: "completed" | "pending" | "error";
}

export interface DashboardData {
  user: User;
  recentActivity: ActivityItem[];
  stats: {
    todayReceiving: number;
    todayShipping: number;
    pendingTasks: number;
  };
}
