import { useQuery } from "@tanstack/react-query";
import { useSystemSettingsStore } from "../../../store/system-settings";
import { getSystemSettings } from "../api/systemSettingsApi";

export const SYSTEM_SETTINGS_QUERY_KEY = ["system-settings"] as const;

export function useSystemSettingsQuery() {
  const setSettings = useSystemSettingsStore((state) => state.setSettings);

  return useQuery({
    queryKey: SYSTEM_SETTINGS_QUERY_KEY,
    queryFn: async () => {
      const settings = await getSystemSettings();
      setSettings(settings);
      return settings;
    },
    staleTime: 0,
    gcTime: 2 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
  });
}
