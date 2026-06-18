import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SystemSettingsDto } from "../features/system-settings/api/systemSettingsApi";

const DEFAULT_SYSTEM_SETTINGS: SystemSettingsDto = {
  numberFormat: "tr-TR",
  decimalPlaces: 2,
  restrictCustomersBySalesRepMatch: false,
  demandApprovalCompletionAction: 1,
  quotationApprovalCompletionAction: 1,
  orderApprovalCompletionAction: 1,
  hideDemandVatRate: false,
  hideQuotationVatRate: false,
  hideOrderVatRate: false,
  catalogGroupCodeLabel: null,
  catalogCode1Label: null,
  catalogCode2Label: null,
  catalogCode3Label: null,
  catalogCode4Label: null,
  catalogCode5Label: null,
};

function clampDecimalPlaces(value: number | null | undefined): number {
  if (!Number.isFinite(value)) return DEFAULT_SYSTEM_SETTINGS.decimalPlaces;
  return Math.min(6, Math.max(0, Math.trunc(Number(value))));
}

function normalizeSettings(settings: SystemSettingsDto): SystemSettingsDto {
  return {
    ...DEFAULT_SYSTEM_SETTINGS,
    ...settings,
    decimalPlaces: clampDecimalPlaces(settings.decimalPlaces),
    hideDemandVatRate: Boolean(settings.hideDemandVatRate),
    hideQuotationVatRate: Boolean(settings.hideQuotationVatRate),
    hideOrderVatRate: Boolean(settings.hideOrderVatRate),
  };
}

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
      setSettings: (settings) => set({ settings: normalizeSettings(settings), hasLoadedFromApi: true }),
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
