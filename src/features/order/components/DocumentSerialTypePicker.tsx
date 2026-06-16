import React, { useMemo } from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { Control, useController } from "react-hook-form";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useAuthStore } from "../../../store/auth";
import {
  DocumentSerialRuleType,
  useAvailableDocumentSerialTypes,
  useDocumentSerialAutoFill,
} from "../../document-serial-type-management";
import { PickerModal } from "./PickerModal";
import type { CreateOrderSchema } from "../schemas";

interface DocumentSerialTypePickerProps {
  control: Control<CreateOrderSchema>;
  customerTypeId: number | undefined | null;
  representativeId: number | undefined;
  disabled?: boolean;
  documentId?: number | null;
  readOnly?: boolean;
}

export function DocumentSerialTypePicker({
  control,
  customerTypeId,
  representativeId,
  disabled = false,
  documentId = null,
  readOnly = false,
}: DocumentSerialTypePickerProps): React.ReactElement {
  const { t } = useTranslation();
  const { themeMode } = useUIStore();
  const user = useAuthStore((state) => state.user);
  const branch = useAuthStore((state) => state.branch);

  const isDark = themeMode === "dark";
  const inputBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.6)";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const textColor = isDark ? "#F8FAFC" : "#1E293B";
  const mutedColor = isDark ? "#94A3B8" : "#64748B";
  const brandColor = isDark ? "#EC4899" : "#DB2777";
  const dashedBorderColor = isDark ? "rgba(236, 72, 153, 0.5)" : "rgba(219, 39, 119, 0.5)";
  const dashedBgColor = isDark ? "rgba(236, 72, 153, 0.05)" : "rgba(219, 39, 119, 0.03)";

  const [modalVisible, setModalVisible] = React.useState(false);

  const { field } = useController({
    control,
    name: "order.documentSerialTypeId",
  });

  const { data: availableDocumentSerialTypes = [], isLoading } = useAvailableDocumentSerialTypes(
    customerTypeId,
    representativeId,
    DocumentSerialRuleType.Order
  );

  const { handleDocumentSerialTypeSelect } = useDocumentSerialAutoFill({
    documentId,
    readOnly,
    ruleType: DocumentSerialRuleType.Order,
    salesRepId: representativeId,
    documentSerialTypeId: field.value,
    setDocumentSerialTypeId: field.onChange,
    availableSerialTypes: availableDocumentSerialTypes,
    isAvailableListReady: !isLoading,
    userId: user?.id,
    branchCode: branch?.code,
  });

  const filteredTypes = useMemo(() => {
    return availableDocumentSerialTypes.filter(
      (item) => item.serialPrefix != null && item.serialPrefix.trim() !== ""
    );
  }, [availableDocumentSerialTypes]);

  const isDisabled = disabled || !representativeId;
  const value = field.value;

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={[styles.labelIcon, { color: brandColor }]}>#</Text>
        <Text style={[styles.label, { color: mutedColor }]}>{t("header.serialNumber")}</Text>
      </View>
      <TouchableOpacity
        style={[
          styles.pickerButton,
          {
            backgroundColor: value ? inputBg : dashedBgColor,
            borderColor: isDisabled
              ? isDark
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.05)"
              : value
                ? borderColor
                : dashedBorderColor,
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
              !value && { fontWeight: "600" },
            ]}
            numberOfLines={1}
          >
            {value
              ? filteredTypes.find((type) => type.id === value)?.serialPrefix || t("common.select")
              : t("common.select")}
          </Text>
        )}
        {!isLoading && <View style={[styles.chevronDown, { borderTopColor: brandColor }]} />}
      </TouchableOpacity>

      {filteredTypes.length === 0 && !isLoading && !isDisabled && (
        <Text style={[styles.emptyText, { color: mutedColor }]}>
          {t("header.noAvailableSerialTypes")}
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
          handleDocumentSerialTypeSelect(option.id ? Number(option.id) : null);
          setModalVisible(false);
        }}
        onClose={() => setModalVisible(false)}
        title={t("header.selectSerialNumber")}
        searchPlaceholder={t("header.searchSerialNumber")}
        isLoading={isLoading}
      />
    </View>
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
