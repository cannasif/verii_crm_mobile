import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SystemSettingsDto } from "../features/system-settings/api/systemSettingsApi";

const DEFAULT_SYSTEM_SETTINGS: SystemSettingsDto = {
  numberFormat: "tr-TR",
  decimalPlaces: 2,
  restrictCustomersBySalesRepMatch: false,
};

interface SystemSettingsState {
  settings: SystemSettingsDto;
  hasLoadedFromApi: boolean;
  setSettings: (settings: SystemSettingsDto) => void;
}

export const useSystemSettingsStore = create<SystemSettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SYSTEM_SETTINGS,
      hasLoadedFromApi: false,
      setSettings: (settings) => set({ settings, hasLoadedFromApi: true }),
    }),
    {
      name: "system-settings-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        settings: state.settings,
        hasLoadedFromApi: state.hasLoadedFromApi,
      }),
    }
  )
);

export function getDefaultSystemSettings(): SystemSettingsDto {
  return DEFAULT_SYSTEM_SETTINGS;
}
