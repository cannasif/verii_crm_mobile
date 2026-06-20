import { I18nManager, type TextStyle, type ViewStyle } from "react-native";
import i18n, { isRtlLanguage } from "../locales";

export function isAppRtl(language?: string | null): boolean {
  return isRtlLanguage(language || i18n.language) || I18nManager.isRTL;
}

export function rtlRow(language?: string | null): ViewStyle["flexDirection"] {
  return isAppRtl(language) ? "row-reverse" : "row";
}

export function rtlTextAlign(language?: string | null): "left" | "right" {
  return isAppRtl(language) ? "right" : "left";
}

export function rtlWritingDirection(language?: string | null): TextStyle["writingDirection"] {
  return isAppRtl(language) ? "rtl" : "ltr";
}

export function rtlStartMargin(value: number, language?: string | null): ViewStyle {
  return isAppRtl(language) ? { marginRight: value } : { marginLeft: value };
}

export function rtlEndMargin(value: number, language?: string | null): ViewStyle {
  return isAppRtl(language) ? { marginLeft: value } : { marginRight: value };
}

export function rtlStartPadding(value: number, language?: string | null): ViewStyle {
  return isAppRtl(language) ? { paddingRight: value } : { paddingLeft: value };
}

export function rtlEndPadding(value: number, language?: string | null): ViewStyle {
  return isAppRtl(language) ? { paddingLeft: value } : { paddingRight: value };
}
