import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { Controller, Control } from "react-hook-form";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { ArrowDown01Icon } from "hugeicons-react-native";
import { PickerModal } from "./PickerModal";
import type { CreateDemandSchema } from "../schemas";
import { OfferType } from "../types";

interface OfferTypePickerProps {
  control: Control<CreateDemandSchema>;
  disabled?: boolean;
  /** Daha düşük yükseklik; iki sütunlu satırda kullanım için */
  compact?: boolean;
}

export function OfferTypePicker({
  control,
  disabled = false,
  compact = false,
}: OfferTypePickerProps): React.ReactElement {
  const { t } = useTranslation();
  const { colors, themeMode } = useUIStore();
  const isDark = themeMode === "dark";
  const innerBg = isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF";
  const innerBorder = isDark ? "rgba(255,255,255,0.10)" : colors.border;

  const [modalVisible, setModalVisible] = React.useState(false);

  const offerTypeOptions = React.useMemo(
    () => [
      { id: OfferType.Domestic, name: t("demand.offerType.domestic") },
      { id: OfferType.Export, name: t("demand.offerType.export") },
    ],
    [t]
  );

  return (
    <Controller
      control={control}
      name="demand.offerType"
      rules={{ required: "Talep tipi seçilmelidir" }}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <View style={[styles.container, compact && styles.containerCompact]}>
          <View style={[styles.labelContainer, compact && styles.labelContainerCompact]}>
            <Text style={[styles.label, compact && styles.labelCompact, { color: colors.textSecondary }]}>
              {t("demand.offerType.label")}{" "}
              <Text style={[styles.required, compact && styles.requiredCompact, { color: colors.accent }]}>*</Text>
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.pickerButton,
              compact && styles.pickerButtonCompact,
              {
                backgroundColor: innerBg,
                borderColor: error ? colors.error : innerBorder,
              },
            ]}
            onPress={() => !disabled && setModalVisible(true)}
            disabled={disabled}
            activeOpacity={disabled ? 1 : undefined}
          >
            <Text
              style={[
                styles.pickerText,
                compact && styles.pickerTextCompact,
                {
                  color: value ? colors.text : colors.textMuted,
                },
              ]}
              numberOfLines={1}
            >
              {value
                ? offerTypeOptions.find((opt) => opt.id === value)?.name || t("common.select")
                : t("common.select")}
            </Text>
            <ArrowDown01Icon size={14} color={colors.textMuted} variant="stroke" strokeWidth={1.8} />
          </TouchableOpacity>

          {error && (
            <Text style={[styles.errorText, { color: colors.error }]}>
              {error.message || t("demand.offerType.required")}
            </Text>
          )}

          <PickerModal
            visible={modalVisible}
            options={offerTypeOptions}
            selectedValue={value || undefined}
            onSelect={(option) => {
              onChange(option.id);
              setModalVisible(false);
            }}
            onClose={() => setModalVisible(false)}
            title={t("demand.offerType.selectTitle")}
            searchPlaceholder={t("demand.offerType.searchPlaceholder")}
            isLoading={false}
          />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  containerCompact: {
    marginBottom: 0,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  labelContainerCompact: {
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  labelCompact: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  required: {
    fontSize: 14,
    fontWeight: "600",
  },
  requiredCompact: {
    fontSize: 11,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 46,
    gap: 6,
  },
  pickerButtonCompact: {
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  pickerText: {
    fontSize: 15,
    flex: 1,
  },
  pickerTextCompact: {
    fontSize: 13,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
});
