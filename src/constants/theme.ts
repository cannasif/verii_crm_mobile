import { Appearance } from "react-native";

export const COLORS = {
  light: {
    background: "#f8f9fc",
    backgroundSecondary: "#F9FAFB",
    card: "#FFFFFF",
    cardBorder: "#F3F4F6",
    header: "#1E293B",
    text: "#111827",
    textSecondary: "#6B7280",
    textMuted: "#9CA3AF",
    accent: "#ec4899",
    accentSecondary: "#f97316",
    accentTertiary: "#facc15",
    onAccent: "#FFFFFF",
    border: "#E5E7EB",
    error: "#EF4444",
    success: "#10B981",
    warning: "#F59E0B",
    navBar: "#FFFFFF",
    navBarBorder: "#F3F4F6",
    activeBackground: "#FEF2F2",
  },
  dark: {
    background: "#0c0516",
    backgroundSecondary: "#0f0518",
    card: "rgba(20, 10, 30, 0.7)",
    cardBorder: "rgba(255, 255, 255, 0.1)",
    header: "#0f0518",
    text: "#FFFFFF",
    textSecondary: "#CBD5E1",
    textMuted: "#94A3B8",
    accent: "#ec4899",
    accentSecondary: "#f97316",
    accentTertiary: "#facc15",
    onAccent: "#FFFFFF",
    border: "rgba(255, 255, 255, 0.1)",
    error: "#f472b6",
    success: "#34d399",
    warning: "#fbbf24",
    navBar: "#1a0b2e",
    navBarBorder: "rgba(255, 255, 255, 0.1)",
    activeBackground: "rgba(236, 72, 153, 0.15)",
  },
} as const;

export const GRADIENT = {
  primary: ["#db2777", "#f97316", "#eab308"] as const,
  primaryHover: ["#ec4899", "#fb923c", "#facc15"] as const,
};

export type ThemeMode = "light" | "dark";
export type ThemeColors = (typeof COLORS)[ThemeMode];

export function getSystemTheme(): ThemeMode {
  return Appearance.getColorScheme() === "dark" ? "dark" : "light";
}
