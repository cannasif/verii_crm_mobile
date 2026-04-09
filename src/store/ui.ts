import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS, type ThemeMode, type ThemeColors } from "../constants/theme";

export type MenuViewType = "list" | "grid";

interface UIState {
  isLoading: boolean;
  themeMode: ThemeMode;
  colors: ThemeColors;
  isSidebarOpen: boolean;
  menuViewType: MenuViewType;
  /** Kartvizit/QR uygulandığında firma adı alanını büyük harfe çevir (elle yazımda zorlanmaz). */
  uppercaseCompanyNameAfterScan: boolean;
  setIsLoading: (value: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  setMenuViewType: (type: MenuViewType) => void;
  setUppercaseCompanyNameAfterScan: (value: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      isLoading: false,
      themeMode: "light",
      colors: COLORS.light,
      isSidebarOpen: false,
      menuViewType: "list",
      uppercaseCompanyNameAfterScan: true,
      setIsLoading: (value: boolean) => set({ isLoading: value }),
      setThemeMode: (mode: ThemeMode) =>
        set({ themeMode: mode, colors: COLORS[mode] }),
      toggleTheme: () => {
        const currentMode = get().themeMode;
        const newMode = currentMode === "light" ? "dark" : "light";
        set({ themeMode: newMode, colors: COLORS[newMode] });
      },
      openSidebar: () => set({ isSidebarOpen: true }),
      closeSidebar: () => set({ isSidebarOpen: false }),
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setMenuViewType: (type: MenuViewType) => set({ menuViewType: type }),
      setUppercaseCompanyNameAfterScan: (value: boolean) => set({ uppercaseCompanyNameAfterScan: value }),
    }),
    {
      name: "ui-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        themeMode: state.themeMode,
        menuViewType: state.menuViewType,
        uppercaseCompanyNameAfterScan: state.uppercaseCompanyNameAfterScan,
      }),
      version: 4,
      migrate: (persistedState, version) => {
        const state = (persistedState ?? {}) as Partial<UIState>;
        const savedMode = state.themeMode;
        const validMode = (savedMode === "light" || savedMode === "dark") ? savedMode : "light";

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

        return {
          ...state,
          themeMode: validMode,
          colors: COLORS[validMode],
          menuViewType,
          uppercaseCompanyNameAfterScan,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          const modeToUse = (state.themeMode === "light" || state.themeMode === "dark") 
            ? state.themeMode 
            : "light";
            
          state.setThemeMode(modeToUse);

          if (state.menuViewType !== "grid" && state.menuViewType !== "list") {
            state.setMenuViewType("list");
          }
        }
      },
    }
  )
);