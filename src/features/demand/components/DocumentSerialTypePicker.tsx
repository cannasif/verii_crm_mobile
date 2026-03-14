import React, { useCallback, useMemo } from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { Controller, Control } from "react-hook-form";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useAvailableDocumentSerialTypes } from "../hooks";
import { PricingRuleType } from "../types";
import { PickerModal } from "./PickerModal";
import type { CreateDemandSchema } from "../schemas";

interface DocumentSerialTypePickerProps {
  control: Control<CreateDemandSchema>;
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
  const { colors } = useUIStore();

  const [modalVisible, setModalVisible] = React.useState(false);

  const { data: availableDocumentSerialTypes = [], isLoading } = useAvailableDocumentSerialTypes(
    customerTypeId,
    representativeId,
    PricingRuleType.Demand
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
      name="demand.documentSerialTypeId"
      render={({ field: { onChange, value } }) => (
        <View style={styles.container}>
          <View style={styles.labelContainer}>
            <Text style={styles.labelIcon}>#</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Seri No</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.pickerButton,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: isDisabled ? colors.border + "80" : colors.border,
              },
              isDisabled && styles.pickerButtonDisabled,
            ]}
            onPress={() => !isDisabled && setModalVisible(true)}
            disabled={isDisabled}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text
                style={[
                  styles.pickerText,
                  {
                    color: value
                      ? colors.text
                      : colors.textMuted,
                  },
                ]}
                numberOfLines={1}
              >
                {value
                  ? filteredTypes.find((type) => type.id === value)?.serialPrefix || "Seçiniz"
                  : "Seçiniz"}
              </Text>
            )}
            {!isLoading && (
              <Text style={[styles.arrowIcon, { color: colors.textMuted }]}>›</Text>
            )}
          </TouchableOpacity>

          {filteredTypes.length === 0 && !isLoading && !isDisabled && (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
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
    marginBottom: 6,
  },
  labelIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  pickerButtonDisabled: {
    opacity: 0.6,
  },
  pickerText: {
    fontSize: 15,
    flex: 1,
  },
  arrowIcon: {
    fontSize: 20,
    fontWeight: "300",
    marginLeft: 8,
  },
  emptyText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: "italic",
  },
});
