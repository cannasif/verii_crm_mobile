import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  Platform,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowDown01Icon, CheckmarkCircle02Icon } from "hugeicons-react-native";

import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { Gender } from "../types";

interface GenderOption {
  value: string;
  label: string;
}

interface GenderPickerFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function GenderPickerField({
  value,
  onChange,
  error,
}: GenderPickerFieldProps): React.ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";
  const [isOpen, setIsOpen] = useState(false);

  const options = useMemo<GenderOption[]>(
    () => [
      { value: "", label: t("profileDetail.genderNone") },
      { value: String(Gender.NotSpecified), label: t("profileDetail.genderNotSpecified") },
      { value: String(Gender.Male), label: t("profileDetail.genderMale") },
      { value: String(Gender.Female), label: t("profileDetail.genderFemale") },
      { value: String(Gender.Other), label: t("profileDetail.genderOther") },
    ],
    [t],
  );

  const selectedOption = options.find((option) => option.value === value);
  const textColor = isDark ? "#F8FAFC" : "#1E293B";
  const mutedColor = isDark ? "#94A3B8" : "#64748B";
  const inputBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.6)";
  const borderColor = error ? "#EF4444" : isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.22)";
  const modalBg = isDark ? "#12101F" : "#FFFFFF";
  const itemBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.14)";
  const selectedBg = isDark ? "rgba(236, 72, 153, 0.12)" : "rgba(219, 39, 119, 0.08)";
  const accentColor = isDark ? "#EC4899" : "#DB2777";

  const handleSelect = (nextValue: string): void => {
    onChange(nextValue);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: textColor }]}>{t("profileDetail.gender")}</Text>

      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => setIsOpen(true)}
        style={[styles.trigger, { backgroundColor: inputBg, borderColor }]}
      >
        <Text
          style={[styles.triggerText, { color: selectedOption?.label ? textColor : mutedColor }]}
          numberOfLines={1}
        >
          {selectedOption?.label ?? t("profileDetail.genderPlaceholder")}
        </Text>
        <ArrowDown01Icon size={16} color={mutedColor} variant="stroke" strokeWidth={2} />
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={isOpen} transparent animationType="slide" onRequestClose={() => setIsOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsOpen(false)} />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: modalBg,
                borderColor: itemBorder,
                paddingBottom: Math.max(insets.bottom, 16) + 8,
              },
            ]}
          >
            <View style={styles.handleWrap}>
              <View style={[styles.handle, { backgroundColor: mutedColor }]} />
            </View>
            <Text style={[styles.sheetTitle, { color: textColor }]}>{t("profileDetail.gender")}</Text>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value || "none"}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => handleSelect(item.value)}
                    style={[
                      styles.optionRow,
                      {
                        borderBottomColor: itemBorder,
                        backgroundColor: isSelected ? selectedBg : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: isSelected ? accentColor : textColor,
                          fontWeight: isSelected ? "700" : "500",
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {isSelected ? (
                      <CheckmarkCircle02Icon size={18} color={accentColor} variant="stroke" strokeWidth={2} />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: { fontSize: 13, fontWeight: "700" },
  trigger: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  triggerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    marginRight: 8,
    marginTop: Platform.OS === "android" ? 1 : 0,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: "62%",
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    opacity: 0.35,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  listContent: {
    paddingBottom: 8,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontSize: 15,
    flex: 1,
    marginRight: 12,
  },
});
