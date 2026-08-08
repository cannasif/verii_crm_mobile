import { useQuery } from "@tanstack/react-query";
import { useSystemSettingsStore } from "../../../store/system-settings";
import { getSystemSettings } from "../api/system-settings-api";
import { systemSettingsQueryKeys } from "../utils/query-keys";

export function useSystemSettingsQuery() {
  const setSettings = useSystemSettingsStore((state) => state.setSettings);

  return useQuery({
    queryKey: systemSettingsQueryKeys.settings(),
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
