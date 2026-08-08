import { useAuthStore } from "../../../store/auth";
import type { DashboardData, ActivityItem } from "../types/home-types";
import type { User } from "../../auth/types/auth-types";

const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: "1",
    type: "receiving",
    title: "Mal Kabul #RCV-2024-001",
    description: "150 ürün teslim alındı",
    timestamp: "2024-01-23T10:30:00Z",
    status: "completed",
  },
  {
    id: "2",
    type: "shipping",
    title: "Sevkiyat #SHP-2024-042",
    description: "Kargo hazırlandı",
    timestamp: "2024-01-23T09:15:00Z",
    status: "completed",
  },
  {
    id: "3",
    type: "transfer",
    title: "Transfer #TRF-2024-018",
    description: "A-12 → B-05 lokasyonuna taşındı",
    timestamp: "2024-01-23T08:45:00Z",
    status: "pending",
  },
];

export async function fetchDashboardData(): Promise<DashboardData> {
  const user = useAuthStore.getState().user;

  const defaultUser: User = {
    id: 0,
    name: "Kullanıcı",
    email: "",
  };

  return {
    user: user || defaultUser,
    recentActivity: MOCK_ACTIVITY,
    stats: {
      todayReceiving: 12,
      todayShipping: 8,
      pendingTasks: 5,
    },
  };
}

export const homeApi = {
  fetchDashboardData,
};
