import type { ThemeColors } from "../../../constants/theme";

const CANVAS_LIGHT = "#f3f4f6";
const CANVAS_DARK = "#140a1f";

function parseHex(hex: string): [number, number, number] | null {
  if (!hex.startsWith("#") || hex.length !== 7) {
    return null;
  }
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return null;
  }
  return [r, g, b];
}

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function blendHex(fg: string, bgHex: string, fgWeight: number): string {
  const a = parseHex(fg);
  const b = parseHex(bgHex);
  if (!a || !b) {
    return fg;
  }
  const t = Math.max(0, Math.min(1, fgWeight));
  const r = clamp255(a[0] * t + b[0] * (1 - t));
  const g = clamp255(a[1] * t + b[1] * (1 - t));
  const bl = clamp255(a[2] * t + b[2] * (1 - t));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl
    .toString(16)
    .padStart(2, "0")}`;
}

export function getSoftSeriesColors(colors: ThemeColors, isDark: boolean): {
  demand: string;
  quotation: string;
  order: string;
} {
  const canvas = isDark ? CANVAS_DARK : CANVAS_LIGHT;
  return {
    demand: blendHex(colors.accentTertiary, canvas, isDark ? 0.72 : 0.62),
    quotation: blendHex(colors.accent, canvas, isDark ? 0.68 : 0.58),
    order: blendHex(colors.accentSecondary, canvas, isDark ? 0.7 : 0.6),
  };
}

export function getSoftDistributionColors(colors: ThemeColors, isDark: boolean): {
  demand: string;
  quotation: string;
  order: string;
} {
  const canvas = isDark ? CANVAS_DARK : CANVAS_LIGHT;
  return {
    demand: blendHex(colors.accentTertiary, canvas, isDark ? 0.55 : 0.48),
    quotation: blendHex(colors.accent, canvas, isDark ? 0.5 : 0.44),
    order: blendHex(colors.accentSecondary, canvas, isDark ? 0.52 : 0.46),
  };
}

export function getVividDistributionColors(colors: ThemeColors, isDark: boolean): {
  demand: string;
  quotation: string;
  order: string;
} {
  const canvas = isDark ? CANVAS_DARK : CANVAS_LIGHT;
  return {
    demand: blendHex(colors.accentTertiary, canvas, isDark ? 0.78 : 0.68),
    quotation: blendHex(colors.accent, canvas, isDark ? 0.82 : 0.74),
    order: blendHex(colors.accentSecondary, canvas, isDark ? 0.8 : 0.72),
  };
}

export function getSoftBarColors(colors: ThemeColors, isDark: boolean): {
  last12: string;
  openQuotation: string;
  openOrder: string;
} {
  const canvas = isDark ? CANVAS_DARK : CANVAS_LIGHT;
  return {
    last12: blendHex(colors.accent, canvas, isDark ? 0.78 : 0.68),
    openQuotation: blendHex(colors.accentSecondary, canvas, isDark ? 0.75 : 0.65),
    openOrder: blendHex(colors.warning, canvas, isDark ? 0.72 : 0.62),
  };
}

export function hexToRgba(hex: string, alpha: number): string {
  const rgb = parseHex(hex);
  if (!rgb) {
    return `rgba(128,128,128,${alpha})`;
  }
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}
