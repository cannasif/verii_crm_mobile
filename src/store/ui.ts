import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  isBrandTheme,
  resolveThemeColors,
  type BrandTheme,
  type ThemeMode,
  type ThemeColors,
} from "../constants/theme";

export type MenuViewType = "list" | "grid";

interface UIState {
  isLoading: boolean;
  activeNetworkRequestCount: number;
  themeMode: ThemeMode;
  brandTheme: BrandTheme;
  colors: ThemeColors;
  isSidebarOpen: boolean;
  menuViewType: MenuViewType;
  /** Kartvizit/QR uygulandığında firma adı alanını büyük harfe çevir (elle yazımda zorlanmaz). */
  uppercaseCompanyNameAfterScan: boolean;
  /** Stok seçme ekranında birim bilgisini meta satırında göster/gizle. */
  showUnitInStockSelection: boolean;
  setIsLoading: (value: boolean) => void;
  incrementNetworkRequest: () => void;
  decrementNetworkRequest: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  setBrandTheme: (theme: BrandTheme) => void;
  toggleTheme: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  setMenuViewType: (type: MenuViewType) => void;
  setUppercaseCompanyNameAfterScan: (value: boolean) => void;
  setShowUnitInStockSelection: (value: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      isLoading: false,
      activeNetworkRequestCount: 0,
      themeMode: "light",
      brandTheme: "v3rii",
      colors: resolveThemeColors("light", "v3rii"),
      isSidebarOpen: false,
      menuViewType: "list",
      uppercaseCompanyNameAfterScan: true,
      showUnitInStockSelection: true,
      setIsLoading: (value: boolean) => set({ isLoading: value }),
      incrementNetworkRequest: () =>
        set((state) => ({ activeNetworkRequestCount: state.activeNetworkRequestCount + 1 })),
      decrementNetworkRequest: () =>
        set((state) => ({
          activeNetworkRequestCount: Math.max(0, state.activeNetworkRequestCount - 1),
        })),
      setThemeMode: (mode: ThemeMode) =>
        set((state) => ({
          themeMode: mode,
          colors: resolveThemeColors(mode, state.brandTheme),
        })),
      setBrandTheme: (theme: BrandTheme) =>
        set((state) => ({
          brandTheme: theme,
          colors: resolveThemeColors(state.themeMode, theme),
        })),
      toggleTheme: () => {
        const currentMode = get().themeMode;
        const newMode = currentMode === "light" ? "dark" : "light";
        set({ themeMode: newMode, colors: resolveThemeColors(newMode, get().brandTheme) });
      },
      openSidebar: () => set({ isSidebarOpen: true }),
      closeSidebar: () => set({ isSidebarOpen: false }),
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setMenuViewType: (type: MenuViewType) => set({ menuViewType: type }),
      setUppercaseCompanyNameAfterScan: (value: boolean) => set({ uppercaseCompanyNameAfterScan: value }),
      setShowUnitInStockSelection: (value: boolean) => set({ showUnitInStockSelection: value }),
    }),
    {
      name: "ui-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        themeMode: state.themeMode,
        brandTheme: state.brandTheme,
        menuViewType: state.menuViewType,
        uppercaseCompanyNameAfterScan: state.uppercaseCompanyNameAfterScan,
        showUnitInStockSelection: state.showUnitInStockSelection,
      }),
      version: 7,
      migrate: (persistedState, version) => {
        const state = (persistedState ?? {}) as Partial<UIState>;
        const savedMode = state.themeMode;
        const validMode = (savedMode === "light" || savedMode === "dark") ? savedMode : "light";
        const savedBrandTheme = state.brandTheme;
        const validBrandTheme = isBrandTheme(savedBrandTheme) ? savedBrandTheme : "v3rii";

        let menuViewType: MenuViewType =
          state.menuViewType === "grid" || state.menuViewType === "list"
            ? state.menuViewType
            : "list";

        if (version < 3) {
          menuViewType = "list";
        }

        const uppercaseCompanyNameAfterScan =
          typeof state.uppercaseCompanyNameAfterScan === "boolean"
            ? state.uppercaseCompanyNameAfterScan
            : true;
        const showUnitInStockSelection =
          typeof state.showUnitInStockSelection === "boolean"
            ? state.showUnitInStockSelection
            : true;

        return {
          ...state,
          themeMode: validMode,
          brandTheme: validBrandTheme,
          colors: resolveThemeColors(validMode, validBrandTheme),
          menuViewType,
          uppercaseCompanyNameAfterScan,
          showUnitInStockSelection,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          const modeToUse = (state.themeMode === "light" || state.themeMode === "dark") 
            ? state.themeMode 
            : "light";
          const brandThemeToUse = isBrandTheme(state.brandTheme) ? state.brandTheme : "v3rii";

          state.themeMode = modeToUse;
          state.brandTheme = brandThemeToUse;
          state.colors = resolveThemeColors(modeToUse, brandThemeToUse);

          if (state.menuViewType !== "grid" && state.menuViewType !== "list") {
            state.setMenuViewType("list");
          }
        }
      },
    }
  )
);
