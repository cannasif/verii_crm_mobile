import { Appearance } from "react-native";

export type ThemeMode = "light" | "dark";

export const brandThemeIds = [
  "v3rii",
  "corporateBlue",
  "graphite",
  "emerald",
  "executive",
  "burgundy",
  "industrialSteel",
  "cleanLight",
  "highContrast",
  "minimalCrm",
  "flatNavy",
  "flatSlate",
  "flatWhite",
] as const;

export type BrandTheme = (typeof brandThemeIds)[number];

export type BrandThemeDefinition = {
  id: BrandTheme;
  label: string;
  description: string;
  swatches: readonly [string, string, string];
  gradient: readonly [string, string, string];
};

export type ThemeColors = {
  background: string;
  backgroundSecondary: string;
  card: string;
  cardBorder: string;
  header: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSecondary: string;
  accentTertiary: string;
  onAccent: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  navBar: string;
  navBarBorder: string;
  activeBackground: string;
  gradientPrimaryStart: string;
  gradientPrimaryMiddle: string;
  gradientPrimaryEnd: string;
  gradientPrimaryHoverStart: string;
  gradientPrimaryHoverMiddle: string;
  gradientPrimaryHoverEnd: string;
};

type BrandThemePalette = {
  accent: string;
  accentSecondary: string;
  accentTertiary: string;
  light: {
    background: string;
    backgroundSecondary: string;
    card: string;
    cardBorder: string;
    header: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    navBar: string;
    navBarBorder: string;
    activeBackground: string;
  };
  dark: {
    background: string;
    backgroundSecondary: string;
    card: string;
    cardBorder: string;
    header: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    navBar: string;
    navBarBorder: string;
    activeBackground: string;
  };
};

export const brandThemes: readonly BrandThemeDefinition[] = [
  {
    id: "v3rii",
    label: "V3RII Neon",
    description: "Mevcut pembe/turuncu marka enerjisi",
    swatches: ["#ec007a", "#7c3aed", "#ff4b00"],
    gradient: ["#db2777", "#f97316", "#eab308"],
  },
  {
    id: "corporateBlue",
    label: "Kurumsal Lacivert",
    description: "Finans, üretim ve B2B müşteriler için güven veren mavi",
    swatches: ["#1e3a8a", "#2563eb", "#06b6d4"],
    gradient: ["#1e3a8a", "#2563eb", "#06b6d4"],
  },
  {
    id: "graphite",
    label: "Grafit Gri",
    description: "Sade, operasyonel ve az dikkat dağıtan tema",
    swatches: ["#111827", "#64748b", "#94a3b8"],
    gradient: ["#111827", "#475569", "#94a3b8"],
  },
  {
    id: "emerald",
    label: "Finans Yeşili",
    description: "Güven, onay ve finans ekranları için yumuşak ton",
    swatches: ["#065f46", "#10b981", "#2dd4bf"],
    gradient: ["#065f46", "#10b981", "#2dd4bf"],
  },
  {
    id: "executive",
    label: "Premium Koyu",
    description: "Lacivert, mor ve altın aksanlı üst seviye his",
    swatches: ["#111827", "#6d28d9", "#f59e0b"],
    gradient: ["#111827", "#6d28d9", "#f59e0b"],
  },
  {
    id: "burgundy",
    label: "Bordo Kurumsal",
    description: "ERP ekranlarına yakın, ağır ve kurumsal his",
    swatches: ["#7f1d1d", "#b91c1c", "#f97316"],
    gradient: ["#7f1d1d", "#b91c1c", "#f97316"],
  },
  {
    id: "industrialSteel",
    label: "Endüstriyel Çelik",
    description: "Üretim, stok ve fabrika operasyonları için metalik yapı",
    swatches: ["#0f172a", "#475569", "#38bdf8"],
    gradient: ["#0f172a", "#475569", "#38bdf8"],
  },
  {
    id: "cleanLight",
    label: "Sade Açık",
    description: "Gündüz kullanım ve yoğun veri girişi için göz yormayan yapı",
    swatches: ["#f8fafc", "#2563eb", "#14b8a6"],
    gradient: ["#f8fafc", "#2563eb", "#14b8a6"],
  },
  {
    id: "highContrast",
    label: "Yüksek Kontrast",
    description: "Net metin, belirgin sınırlar ve erişilebilir odak hissi",
    swatches: ["#020617", "#f8fafc", "#facc15"],
    gradient: ["#020617", "#1f2937", "#facc15"],
  },
  {
    id: "minimalCrm",
    label: "Minimal CRM",
    description: "Daha az neon, daha çok operasyonel SaaS görünümü",
    swatches: ["#155e75", "#0f766e", "#64748b"],
    gradient: ["#155e75", "#0f766e", "#64748b"],
  },
  {
    id: "flatNavy",
    label: "Düz Lacivert",
    description: "Gradientsiz, net ve kurumsal lacivert arayüz",
    swatches: ["#1e3a8a", "#1e3a8a", "#1e3a8a"],
    gradient: ["#1e3a8a", "#1e3a8a", "#1e3a8a"],
  },
  {
    id: "flatSlate",
    label: "Düz Grafit",
    description: "Gradientsiz, sakin ve operasyonel yönetim paneli",
    swatches: ["#334155", "#334155", "#334155"],
    gradient: ["#334155", "#334155", "#334155"],
  },
  {
    id: "flatWhite",
    label: "Düz Açık",
    description: "Gradientsiz, aydınlık ve yoğun veri girişi odaklı tema",
    swatches: ["#f8fafc", "#2563eb", "#e2e8f0"],
    gradient: ["#2563eb", "#2563eb", "#2563eb"],
  },
] as const;

const brandThemeIdSet = new Set<string>(brandThemeIds);

const BRAND_THEME_PALETTES: Record<BrandTheme, BrandThemePalette> = {
  v3rii: {
    accent: "#ec4899",
    accentSecondary: "#f97316",
    accentTertiary: "#facc15",
    light: {
      background: "#f8f9fc",
      backgroundSecondary: "#F9FAFB",
      card: "#FFFFFF",
      cardBorder: "#F3F4F6",
      header: "#1E293B",
      text: "#111827",
      textSecondary: "#6B7280",
      textMuted: "#9CA3AF",
      border: "#E5E7EB",
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
      border: "rgba(255, 255, 255, 0.1)",
      navBar: "#1a0b2e",
      navBarBorder: "rgba(255, 255, 255, 0.1)",
      activeBackground: "rgba(236, 72, 153, 0.15)",
    },
  },
  corporateBlue: {
    accent: "#2563eb",
    accentSecondary: "#06b6d4",
    accentTertiary: "#60a5fa",
    light: {
      background: "#f6f9ff",
      backgroundSecondary: "#eff6ff",
      card: "#ffffff",
      cardBorder: "#dbeafe",
      header: "#0f2f5f",
      text: "#0f172a",
      textSecondary: "#475569",
      textMuted: "#94a3b8",
      border: "#dbeafe",
      navBar: "#ffffff",
      navBarBorder: "#dbeafe",
      activeBackground: "#dbeafe",
    },
    dark: {
      background: "#071526",
      backgroundSecondary: "#0b1f35",
      card: "rgba(15, 47, 95, 0.62)",
      cardBorder: "rgba(96, 165, 250, 0.22)",
      header: "#08182b",
      text: "#f8fafc",
      textSecondary: "#cbd5e1",
      textMuted: "#93a4b8",
      border: "rgba(96, 165, 250, 0.18)",
      navBar: "#0b1f35",
      navBarBorder: "rgba(96, 165, 250, 0.18)",
      activeBackground: "rgba(37, 99, 235, 0.18)",
    },
  },
  graphite: {
    accent: "#64748b",
    accentSecondary: "#94a3b8",
    accentTertiary: "#cbd5e1",
    light: {
      background: "#f8fafc",
      backgroundSecondary: "#f1f5f9",
      card: "#ffffff",
      cardBorder: "#e2e8f0",
      header: "#111827",
      text: "#111827",
      textSecondary: "#475569",
      textMuted: "#94a3b8",
      border: "#e2e8f0",
      navBar: "#ffffff",
      navBarBorder: "#e2e8f0",
      activeBackground: "#e2e8f0",
    },
    dark: {
      background: "#0b1120",
      backgroundSecondary: "#111827",
      card: "rgba(30, 41, 59, 0.72)",
      cardBorder: "rgba(148, 163, 184, 0.2)",
      header: "#0f172a",
      text: "#f8fafc",
      textSecondary: "#cbd5e1",
      textMuted: "#94a3b8",
      border: "rgba(148, 163, 184, 0.18)",
      navBar: "#111827",
      navBarBorder: "rgba(148, 163, 184, 0.18)",
      activeBackground: "rgba(100, 116, 139, 0.22)",
    },
  },
  emerald: {
    accent: "#10b981",
    accentSecondary: "#2dd4bf",
    accentTertiary: "#a7f3d0",
    light: {
      background: "#f4fbf8",
      backgroundSecondary: "#ecfdf5",
      card: "#ffffff",
      cardBorder: "#d1fae5",
      header: "#064e3b",
      text: "#0f172a",
      textSecondary: "#475569",
      textMuted: "#94a3b8",
      border: "#d1fae5",
      navBar: "#ffffff",
      navBarBorder: "#d1fae5",
      activeBackground: "#d1fae5",
    },
    dark: {
      background: "#061a15",
      backgroundSecondary: "#08251d",
      card: "rgba(6, 95, 70, 0.45)",
      cardBorder: "rgba(45, 212, 191, 0.2)",
      header: "#052e25",
      text: "#f8fafc",
      textSecondary: "#ccfbf1",
      textMuted: "#99f6e4",
      border: "rgba(45, 212, 191, 0.18)",
      navBar: "#08251d",
      navBarBorder: "rgba(45, 212, 191, 0.18)",
      activeBackground: "rgba(16, 185, 129, 0.18)",
    },
  },
  executive: {
    accent: "#6d28d9",
    accentSecondary: "#f59e0b",
    accentTertiary: "#c4b5fd",
    light: {
      background: "#f8f7ff",
      backgroundSecondary: "#f5f3ff",
      card: "#ffffff",
      cardBorder: "#ddd6fe",
      header: "#111827",
      text: "#111827",
      textSecondary: "#4b5563",
      textMuted: "#9ca3af",
      border: "#ddd6fe",
      navBar: "#ffffff",
      navBarBorder: "#ddd6fe",
      activeBackground: "#ede9fe",
    },
    dark: {
      background: "#090b18",
      backgroundSecondary: "#111827",
      card: "rgba(31, 41, 55, 0.72)",
      cardBorder: "rgba(196, 181, 253, 0.22)",
      header: "#0b1020",
      text: "#f8fafc",
      textSecondary: "#ddd6fe",
      textMuted: "#a78bfa",
      border: "rgba(196, 181, 253, 0.18)",
      navBar: "#111827",
      navBarBorder: "rgba(196, 181, 253, 0.18)",
      activeBackground: "rgba(109, 40, 217, 0.2)",
    },
  },
  burgundy: {
    accent: "#b91c1c",
    accentSecondary: "#f97316",
    accentTertiary: "#fca5a5",
    light: {
      background: "#fff7f7",
      backgroundSecondary: "#fef2f2",
      card: "#ffffff",
      cardBorder: "#fecaca",
      header: "#7f1d1d",
      text: "#111827",
      textSecondary: "#57534e",
      textMuted: "#a8a29e",
      border: "#fecaca",
      navBar: "#ffffff",
      navBarBorder: "#fecaca",
      activeBackground: "#fee2e2",
    },
    dark: {
      background: "#1b0909",
      backgroundSecondary: "#260d0d",
      card: "rgba(69, 10, 10, 0.62)",
      cardBorder: "rgba(248, 113, 113, 0.2)",
      header: "#260d0d",
      text: "#fff7ed",
      textSecondary: "#fecaca",
      textMuted: "#fca5a5",
      border: "rgba(248, 113, 113, 0.18)",
      navBar: "#260d0d",
      navBarBorder: "rgba(248, 113, 113, 0.18)",
      activeBackground: "rgba(185, 28, 28, 0.22)",
    },
  },
  industrialSteel: {
    accent: "#475569",
    accentSecondary: "#38bdf8",
    accentTertiary: "#94a3b8",
    light: {
      background: "#f4f7fa",
      backgroundSecondary: "#eef3f8",
      card: "#ffffff",
      cardBorder: "#cbd5e1",
      header: "#0f172a",
      text: "#0f172a",
      textSecondary: "#475569",
      textMuted: "#94a3b8",
      border: "#d8e0e8",
      navBar: "#ffffff",
      navBarBorder: "#d8e0e8",
      activeBackground: "#e2e8f0",
    },
    dark: {
      background: "#07111f",
      backgroundSecondary: "#0f172a",
      card: "rgba(30, 41, 59, 0.72)",
      cardBorder: "rgba(56, 189, 248, 0.18)",
      header: "#0f172a",
      text: "#f8fafc",
      textSecondary: "#cbd5e1",
      textMuted: "#94a3b8",
      border: "rgba(56, 189, 248, 0.16)",
      navBar: "#0f172a",
      navBarBorder: "rgba(56, 189, 248, 0.16)",
      activeBackground: "rgba(71, 85, 105, 0.24)",
    },
  },
  cleanLight: {
    accent: "#2563eb",
    accentSecondary: "#14b8a6",
    accentTertiary: "#93c5fd",
    light: {
      background: "#fbfdff",
      backgroundSecondary: "#f8fafc",
      card: "#ffffff",
      cardBorder: "#e2e8f0",
      header: "#f8fafc",
      text: "#0f172a",
      textSecondary: "#475569",
      textMuted: "#94a3b8",
      border: "#e2e8f0",
      navBar: "#ffffff",
      navBarBorder: "#e2e8f0",
      activeBackground: "#dbeafe",
    },
    dark: {
      background: "#071526",
      backgroundSecondary: "#0b1f35",
      card: "rgba(15, 47, 95, 0.56)",
      cardBorder: "rgba(20, 184, 166, 0.18)",
      header: "#08182b",
      text: "#f8fafc",
      textSecondary: "#cbd5e1",
      textMuted: "#94a3b8",
      border: "rgba(20, 184, 166, 0.16)",
      navBar: "#0b1f35",
      navBarBorder: "rgba(20, 184, 166, 0.16)",
      activeBackground: "rgba(37, 99, 235, 0.18)",
    },
  },
  highContrast: {
    accent: "#facc15",
    accentSecondary: "#ffffff",
    accentTertiary: "#2563eb",
    light: {
      background: "#ffffff",
      backgroundSecondary: "#f8fafc",
      card: "#ffffff",
      cardBorder: "#020617",
      header: "#020617",
      text: "#020617",
      textSecondary: "#1e293b",
      textMuted: "#475569",
      border: "#020617",
      navBar: "#ffffff",
      navBarBorder: "#020617",
      activeBackground: "#fef08a",
    },
    dark: {
      background: "#000000",
      backgroundSecondary: "#020617",
      card: "#020617",
      cardBorder: "#facc15",
      header: "#000000",
      text: "#ffffff",
      textSecondary: "#f8fafc",
      textMuted: "#e2e8f0",
      border: "#facc15",
      navBar: "#020617",
      navBarBorder: "#facc15",
      activeBackground: "rgba(250, 204, 21, 0.22)",
    },
  },
  minimalCrm: {
    accent: "#0f766e",
    accentSecondary: "#64748b",
    accentTertiary: "#22d3ee",
    light: {
      background: "#f7fbfb",
      backgroundSecondary: "#f1f5f9",
      card: "#ffffff",
      cardBorder: "#dbe5e8",
      header: "#155e75",
      text: "#0f172a",
      textSecondary: "#475569",
      textMuted: "#94a3b8",
      border: "#dbe5e8",
      navBar: "#ffffff",
      navBarBorder: "#dbe5e8",
      activeBackground: "#ccfbf1",
    },
    dark: {
      background: "#06171b",
      backgroundSecondary: "#0d2428",
      card: "rgba(21, 94, 117, 0.45)",
      cardBorder: "rgba(34, 211, 238, 0.16)",
      header: "#0d2428",
      text: "#f8fafc",
      textSecondary: "#cbd5e1",
      textMuted: "#94a3b8",
      border: "rgba(34, 211, 238, 0.16)",
      navBar: "#0d2428",
      navBarBorder: "rgba(34, 211, 238, 0.16)",
      activeBackground: "rgba(15, 118, 110, 0.22)",
    },
  },
  flatNavy: {
    accent: "#1e3a8a",
    accentSecondary: "#1e3a8a",
    accentTertiary: "#1e3a8a",
    light: {
      background: "#f8fafc",
      backgroundSecondary: "#f1f5f9",
      card: "#ffffff",
      cardBorder: "#dbeafe",
      header: "#1e3a8a",
      text: "#0f172a",
      textSecondary: "#475569",
      textMuted: "#94a3b8",
      border: "#dbeafe",
      navBar: "#ffffff",
      navBarBorder: "#dbeafe",
      activeBackground: "#dbeafe",
    },
    dark: {
      background: "#071526",
      backgroundSecondary: "#0b1f35",
      card: "rgba(30, 58, 138, 0.5)",
      cardBorder: "rgba(147, 197, 253, 0.18)",
      header: "#071526",
      text: "#f8fafc",
      textSecondary: "#cbd5e1",
      textMuted: "#93a4b8",
      border: "rgba(147, 197, 253, 0.16)",
      navBar: "#0b1f35",
      navBarBorder: "rgba(147, 197, 253, 0.16)",
      activeBackground: "rgba(30, 58, 138, 0.24)",
    },
  },
  flatSlate: {
    accent: "#334155",
    accentSecondary: "#334155",
    accentTertiary: "#334155",
    light: {
      background: "#f8fafc",
      backgroundSecondary: "#f1f5f9",
      card: "#ffffff",
      cardBorder: "#e2e8f0",
      header: "#334155",
      text: "#0f172a",
      textSecondary: "#475569",
      textMuted: "#94a3b8",
      border: "#e2e8f0",
      navBar: "#ffffff",
      navBarBorder: "#e2e8f0",
      activeBackground: "#e2e8f0",
    },
    dark: {
      background: "#0b1120",
      backgroundSecondary: "#111827",
      card: "rgba(51, 65, 85, 0.62)",
      cardBorder: "rgba(148, 163, 184, 0.18)",
      header: "#0f172a",
      text: "#f8fafc",
      textSecondary: "#cbd5e1",
      textMuted: "#94a3b8",
      border: "rgba(148, 163, 184, 0.16)",
      navBar: "#111827",
      navBarBorder: "rgba(148, 163, 184, 0.16)",
      activeBackground: "rgba(51, 65, 85, 0.24)",
    },
  },
  flatWhite: {
    accent: "#2563eb",
    accentSecondary: "#2563eb",
    accentTertiary: "#2563eb",
    light: {
      background: "#ffffff",
      backgroundSecondary: "#f8fafc",
      card: "#ffffff",
      cardBorder: "#e2e8f0",
      header: "#ffffff",
      text: "#0f172a",
      textSecondary: "#475569",
      textMuted: "#94a3b8",
      border: "#e2e8f0",
      navBar: "#ffffff",
      navBarBorder: "#e2e8f0",
      activeBackground: "#dbeafe",
    },
    dark: {
      background: "#0f172a",
      backgroundSecondary: "#111827",
      card: "rgba(30, 41, 59, 0.72)",
      cardBorder: "rgba(148, 163, 184, 0.18)",
      header: "#111827",
      text: "#f8fafc",
      textSecondary: "#cbd5e1",
      textMuted: "#94a3b8",
      border: "rgba(148, 163, 184, 0.16)",
      navBar: "#111827",
      navBarBorder: "rgba(148, 163, 184, 0.16)",
      activeBackground: "rgba(37, 99, 235, 0.2)",
    },
  },
};

export function isBrandTheme(value: string | null | undefined): value is BrandTheme {
  return Boolean(value && brandThemeIdSet.has(value));
}

export function getBrandThemeDefinition(theme: BrandTheme): BrandThemeDefinition {
  return brandThemes.find((item) => item.id === theme) ?? brandThemes[0];
}

export function resolveThemeColors(mode: ThemeMode, brandTheme: BrandTheme): ThemeColors {
  const palette = BRAND_THEME_PALETTES[brandTheme] ?? BRAND_THEME_PALETTES.v3rii;
  const base = palette[mode];
  const definition = getBrandThemeDefinition(brandTheme);

  return {
    ...base,
    accent: palette.accent,
    accentSecondary: palette.accentSecondary,
    accentTertiary: palette.accentTertiary,
    onAccent: brandTheme === "highContrast" && mode === "light" ? "#020617" : "#FFFFFF",
    error: mode === "dark" ? "#f472b6" : "#EF4444",
    success: mode === "dark" ? "#34d399" : "#10B981",
    warning: mode === "dark" ? "#fbbf24" : "#F59E0B",
    gradientPrimaryStart: definition.gradient[0],
    gradientPrimaryMiddle: definition.gradient[1],
    gradientPrimaryEnd: definition.gradient[2],
    gradientPrimaryHoverStart: palette.accent,
    gradientPrimaryHoverMiddle: palette.accentSecondary,
    gradientPrimaryHoverEnd: palette.accentTertiary,
  };
}

export const COLORS: Record<ThemeMode, ThemeColors> = {
  light: resolveThemeColors("light", "v3rii"),
  dark: resolveThemeColors("dark", "v3rii"),
};

export const GRADIENT = {
  primary: brandThemes[0].gradient,
  primaryHover: [
    COLORS.light.gradientPrimaryHoverStart,
    COLORS.light.gradientPrimaryHoverMiddle,
    COLORS.light.gradientPrimaryHoverEnd,
  ] as const,
};

export function getSystemTheme(): ThemeMode {
  return Appearance.getColorScheme() === "dark" ? "dark" : "light";
}
