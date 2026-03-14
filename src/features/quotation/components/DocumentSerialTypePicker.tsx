import React, { useCallback, useMemo } from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { Controller, Control } from "react-hook-form";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useAvailableDocumentSerialTypes } from "../hooks";
import { PricingRuleType } from "../types";
import { PickerModal } from "./PickerModal";
import type { CreateQuotationSchema } from "../schemas";

interface DocumentSerialTypePickerProps {
  control: Control<CreateQuotationSchema>;
  customerTypeId: number | undefined | null;
  representativeId: number | undefined;
  disabled?: boolean;
}

export function DocumentSerialTypePicker({
  control,
  customerTypeId,
  representativeId,
  disabled = false,
}: DocumentSerialTypePickerProps): React.ReactElement {
  const { t } = useTranslation();
  const { themeMode } = useUIStore();

  const isDark = themeMode === "dark";
  const inputBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.6)";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const textColor = isDark ? "#F8FAFC" : "#1E293B";
  const mutedColor = isDark ? "#94A3B8" : "#64748B";
  const brandColor = isDark ? "#EC4899" : "#DB2777";
  const dashedBorderColor = isDark ? "rgba(236, 72, 153, 0.5)" : "rgba(219, 39, 119, 0.5)";
  const dashedBgColor = isDark ? "rgba(236, 72, 153, 0.05)" : "rgba(219, 39, 119, 0.03)";

  const [modalVisible, setModalVisible] = React.useState(false);

  const { data: availableDocumentSerialTypes = [], isLoading } = useAvailableDocumentSerialTypes(
    customerTypeId,
    representativeId,
    PricingRuleType.Quotation
  );

  const filteredTypes = useMemo(() => {
    return availableDocumentSerialTypes.filter(
      (d) => d.serialPrefix && d.serialPrefix.trim() !== ""
    );
  }, [availableDocumentSerialTypes]);

  const isDisabled = disabled || !representativeId;

  return (
    <Controller
      control={control}
      name="quotation.documentSerialTypeId"
      render={({ field: { onChange, value } }) => (
        <View style={styles.container}>
          <View style={styles.labelContainer}>
            <Text style={[styles.labelIcon, { color: brandColor }]}>#</Text>
            <Text style={[styles.label, { color: mutedColor }]}>Seri No</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.pickerButton,
              {
                backgroundColor: value ? inputBg : dashedBgColor,
                borderColor: isDisabled ? (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)") : (value ? borderColor : dashedBorderColor),
                borderWidth: value ? 1 : 1.5,
                borderStyle: value ? "solid" : "dashed",
              },
              isDisabled && styles.pickerButtonDisabled,
            ]}
            onPress={() => !isDisabled && setModalVisible(true)}
            disabled={isDisabled}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={brandColor} />
            ) : (
              <Text
                style={[
                  styles.pickerText,
                  { color: value ? textColor : brandColor },
                  !value && { fontWeight: "600" }
                ]}
                numberOfLines={1}
              >
                {value
                  ? filteredTypes.find((t) => t.id === value)?.serialPrefix || "Seçiniz"
                  : "Seçiniz"}
              </Text>
            )}
            {!isLoading && (
              <View style={[styles.chevronDown, { borderTopColor: brandColor }]} />
            )}
          </TouchableOpacity>

          {filteredTypes.length === 0 && !isLoading && !isDisabled && (
            <Text style={[styles.emptyText, { color: mutedColor }]}>
              Uygun seri yok
            </Text>
          )}

          <PickerModal
            visible={modalVisible}
            options={filteredTypes.map((type) => ({
              id: type.id,
              name: type.serialPrefix || type.name || "",
            }))}
            selectedValue={value || undefined}
            onSelect={(option) => {
              onChange(option.id ? Number(option.id) : null);
              setModalVisible(false);
            }}
            onClose={() => setModalVisible(false)}
            title="Seri No Seçiniz"
            searchPlaceholder="Seri no ara..."
            isLoading={isLoading}
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
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  labelIcon: {
    fontSize: 14,
    fontWeight: "700",
    marginRight: 6,
    marginLeft: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  pickerButtonDisabled: {
    opacity: 0.6,
  },
  pickerText: {
    fontSize: 15,
    flex: 1,
  },
  chevronDown: {
    width: 0,
    height: 0,
    marginLeft: 8,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  emptyText: {
    fontSize: 12,
    marginTop: 6,
    fontStyle: "italic",
    marginLeft: 4,
  },
});
