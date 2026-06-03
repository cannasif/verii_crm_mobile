import React, { useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  type KeyboardEvent,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Cancel01Icon } from "hugeicons-react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUIStore } from "../../store/ui";
import { Text } from "../ui/text";

export interface PagedAdvancedFilterTab {
  id: string;
  label: string;
  badge?: number;
}

interface PagedAdvancedFilterModalProps {
  visible: boolean;
  title: string;
  filterLogic: "and" | "or";
  onFilterLogicChange: (value: "and" | "or") => void;
  onClose: () => void;
  onClear: () => void;
  onApply: () => void;
  children: React.ReactNode;
  bottomInset?: number;
  tabs?: PagedAdvancedFilterTab[];
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
  showFilterLogic?: boolean;
  bodyScrollEnabled?: boolean;
  belowFilterLogic?: React.ReactNode;
}

export function PagedAdvancedFilterModal({
  visible,
  title,
  filterLogic,
  onFilterLogicChange,
  onClose,
  onClear,
  onApply,
  children,
  bottomInset = 0,
  tabs,
  activeTabId,
  onTabChange,
  showFilterLogic = true,
  bodyScrollEnabled = true,
  belowFilterLogic,
}: PagedAdvancedFilterModalProps): React.ReactElement {
  const { t } = useTranslation();
  const { themeMode, colors } = useUIStore();
  const isDark = themeMode === "dark";
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [keyboardInset, setKeyboardInset] = useState(0);

  const theme = useMemo(() => {
    const accentSoftBg = isDark ? "rgba(236, 72, 153, 0.12)" : "rgba(219, 39, 119, 0.08)";
    const accentSoftBorder = isDark ? "rgba(236, 72, 153, 0.24)" : "rgba(219, 39, 119, 0.16)";
    const accentActiveBg = isDark ? "rgba(236, 72, 153, 0.18)" : "rgba(219, 39, 119, 0.12)";
    const applyButtonBg = isDark ? "rgba(236, 72, 153, 0.14)" : "rgba(219, 39, 119, 0.08)";
    const applyButtonBorder = isDark ? "rgba(236, 72, 153, 0.28)" : "rgba(219, 39, 119, 0.14)";

    return {
      overlay: isDark ? "rgba(8, 6, 14, 0.88)" : "rgba(0,0,0,0.55)",
      surface: isDark ? "#1a0b2e" : "#FFFFFF",
      text: colors.text,
      textMuted: colors.textMuted,
      border: colors.border,
      softBg: isDark ? "rgba(255,255,255,0.035)" : "#F8FAFC",
      accent: colors.accent,
      accentSoftBg,
      accentSoftBorder,
      accentActiveBg,
      applyButtonBg,
      applyButtonBorder,
      handle: isDark ? "rgba(148,163,184,0.42)" : "rgba(148,163,184,0.48)",
    };
  }, [colors.accent, colors.border, colors.text, colors.textMuted, isDark]);

  const sheetMaxHeight = useMemo(() => {
    const topSlack = insets.top + 8;
    const bottomSlack = bottomInset + 24 + keyboardInset;
    const available = windowHeight - topSlack - bottomSlack;
    return Math.max(200, Math.min(windowHeight * 0.92, available));
  }, [windowHeight, insets.top, bottomInset, keyboardInset]);

  useEffect(() => {
    if (!visible) {
      setKeyboardInset(0);
      return;
    }
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = (e: KeyboardEvent) => setKeyboardInset(e.endCoordinates.height);
    const onHide = () => setKeyboardInset(0);
    const subShow = Keyboard.addListener(showEvt, onShow);
    const subHide = Keyboard.addListener(hideEvt, onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View
          style={[
            styles.content,
            {
              backgroundColor: theme.surface,
              paddingBottom: bottomInset + (keyboardInset > 0 ? 12 : 20),
              height: sheetMaxHeight,
              maxHeight: sheetMaxHeight,
            },
            Platform.OS === "android" ? { elevation: 16 } : null,
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.handle }]} />

          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Cancel01Icon size={24} color={theme.textMuted} variant="stroke" />
            </TouchableOpacity>
          </View>

          {tabs && tabs.length > 0 ? (
            <View
              style={[styles.tabTrack, { backgroundColor: theme.softBg, borderColor: theme.border }]}
            >
              {tabs.map((tab) => {
                const isActive = activeTabId === tab.id;
                const badge = tab.badge ?? 0;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[
                      styles.tabButton,
                      isActive && {
                        backgroundColor: theme.accentActiveBg,
                        borderColor: theme.accentSoftBorder,
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => onTabChange?.(tab.id)}
                    activeOpacity={0.82}
                  >
                    <Text
                      style={[
                        styles.tabButtonText,
                        { color: isActive ? theme.accent : theme.textMuted },
                      ]}
                      numberOfLines={1}
                    >
                      {tab.label}
                    </Text>
                    {badge > 0 ? (
                      <View
                        style={[
                          styles.tabBadge,
                          {
                            backgroundColor: isActive
                              ? theme.accent + (isDark ? "28" : "18")
                              : theme.accent + (isDark ? "20" : "12"),
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tabBadgeText,
                            { color: theme.accent },
                          ]}
                        >
                          {badge}
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {showFilterLogic ? (
            <>
              <Text style={[styles.logicLabel, { color: theme.textMuted }]}>{t("common.logic")}</Text>

              <View
                style={[
                  styles.logicSegmentTrack,
                  belowFilterLogic ? styles.logicSegmentTrackCompact : null,
                  { backgroundColor: theme.softBg, borderColor: theme.border },
                ]}
              >
                {(["and", "or"] as const).map((logicValue) => {
                  const isActive = filterLogic === logicValue;
                  return (
                    <TouchableOpacity
                      key={logicValue}
                      style={[
                        styles.logicSegmentButton,
                        isActive && {
                          backgroundColor: theme.accentActiveBg,
                          borderColor: theme.accentSoftBorder,
                          borderWidth: 1,
                        },
                      ]}
                      onPress={() => onFilterLogicChange(logicValue)}
                      activeOpacity={0.82}
                    >
                      <Text
                        style={[
                          styles.logicSegmentButtonText,
                          { color: isActive ? theme.accent : theme.textMuted },
                        ]}
                      >
                        {logicValue === "and" ? t("common.and") : t("common.or")}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {belowFilterLogic ? (
                <View style={styles.belowFilterLogicSlot}>{belowFilterLogic}</View>
              ) : null}
            </>
          ) : null}

          {bodyScrollEnabled ? (
            <ScrollView
              style={styles.bodyScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.body}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.bodyScroll, styles.bodyFlex, styles.body]}>{children}</View>
          )}

          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[
                styles.footerButton,
                styles.footerButtonSecondary,
                {
                  backgroundColor: theme.accentSoftBg,
                  borderColor: theme.accentSoftBorder,
                },
              ]}
              onPress={onClear}
              activeOpacity={0.82}
            >
              <Text style={[styles.footerButtonText, { color: theme.textMuted }]}>
                {t("common.clear")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.footerButton,
                styles.footerButtonPrimary,
                {
                  backgroundColor: theme.applyButtonBg,
                  borderColor: theme.applyButtonBorder,
                },
              ]}
              onPress={onApply}
              activeOpacity={0.88}
            >
              <Text style={[styles.footerButtonText, styles.footerButtonPrimaryText, { color: theme.accent }]}>
                {t("common.apply")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  content: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 24,
    paddingTop: 16,
    width: "100%",
    flexDirection: "column",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      default: {},
    }),
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    alignSelf: "center",
    marginBottom: 14,
    flexShrink: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    flexShrink: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.25,
  },
  closeButton: {
    padding: 4,
  },
  logicLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 10,
    marginLeft: 4,
    letterSpacing: 0.2,
    flexShrink: 0,
  },
  tabTrack: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
    gap: 3,
    marginBottom: 18,
    flexShrink: 0,
  },
  tabButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 11,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  logicSegmentTrack: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
    gap: 3,
    marginBottom: 18,
    flexShrink: 0,
  },
  logicSegmentTrackCompact: {
    marginBottom: 10,
  },
  belowFilterLogicSlot: {
    alignSelf: "stretch",
    width: "100%",
    marginBottom: 14,
    flexShrink: 0,
  },
  logicSegmentButton: {
    flex: 1,
    borderRadius: 11,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  logicSegmentButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  bodyScroll: {
    flex: 1,
    minHeight: 0,
  },
  bodyFlex: {
    overflow: "hidden",
  },
  body: {
    paddingBottom: 8,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 18,
    paddingBottom: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  footerButton: {
    borderWidth: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  footerButtonSecondary: {
    flex: 1,
  },
  footerButtonPrimary: {
    flex: 1.85,
  },
  footerButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  footerButtonPrimaryText: {
    fontWeight: "700",
  },
});
