import React from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Cancel01Icon } from "hugeicons-react-native";
import { useTranslation } from "react-i18next";
import { useUIStore } from "../../store/ui";
import { Text } from "../ui/text";

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
}: PagedAdvancedFilterModalProps): React.ReactElement {
  const { t } = useTranslation();
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  const theme = {
    overlay: "rgba(0,0,0,0.48)",
    surface: isDark ? "#1E293B" : "#FFFFFF",
    text: isDark ? "#E2E8F0" : "#0F172A",
    textMuted: isDark ? "#94A3B8" : "#64748B",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.18)",
    softBg: isDark ? "rgba(255,255,255,0.045)" : "#F8FAFC",
    activeBg: isDark ? "rgba(236,72,153,0.12)" : "rgba(219,39,119,0.08)",
    accent: "#db2777",
    handle: isDark ? "rgba(148,163,184,0.42)" : "rgba(148,163,184,0.48)",
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View
          style={[
            styles.content,
            { backgroundColor: theme.surface, paddingBottom: bottomInset + 20 },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.handle }]} />

          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Cancel01Icon size={24} color={theme.textMuted} variant="stroke" />
            </TouchableOpacity>
          </View>

          <Text style={[styles.logicLabel, { color: theme.textMuted }]}>{t("common.logic")}</Text>

          <View style={styles.logicRow}>
            {(["and", "or"] as const).map((logicValue) => {
              const isActive = filterLogic === logicValue;
              return (
                <TouchableOpacity
                  key={logicValue}
                  style={[
                    styles.logicButton,
                    {
                      backgroundColor: isActive ? theme.activeBg : theme.softBg,
                      borderColor: isActive ? theme.accent : theme.border,
                    },
                  ]}
                  onPress={() => onFilterLogicChange(logicValue)}
                  activeOpacity={0.72}
                >
                  <Text
                    style={[
                      styles.logicButtonText,
                      { color: isActive ? theme.accent : theme.textMuted },
                    ]}
                  >
                    {logicValue === "and" ? t("common.and") : t("common.or")}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.body}
          >
            {children}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.footerButton,
                { backgroundColor: theme.softBg, borderColor: theme.border, flex: 1, marginRight: 10 },
              ]}
              onPress={onClear}
            >
              <Text style={[styles.footerButtonText, { color: theme.textMuted }]}>
                {t("common.clear")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.footerButton,
                { backgroundColor: theme.accent, borderColor: theme.accent, flex: 2 },
              ]}
              onPress={onApply}
            >
              <Text style={[styles.footerButtonText, { color: "#FFFFFF" }]}>
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
    maxHeight: "88%",
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    alignSelf: "center",
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.2,
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
  },
  logicRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  logicButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  logicButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  body: {
    paddingBottom: 8,
  },
  footer: {
    flexDirection: "row",
    paddingTop: 16,
    paddingBottom: 8,
  },
  footerButton: {
    borderWidth: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  footerButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
