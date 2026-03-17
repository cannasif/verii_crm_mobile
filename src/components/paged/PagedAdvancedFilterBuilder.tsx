import React, { useMemo, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Add01Icon,
  ArrowDown01Icon,
  Cancel01Icon,
  Delete02Icon,
} from "hugeicons-react-native";
import { useTranslation } from "react-i18next";
import { useUIStore } from "../../store/ui";
import { Text } from "../ui/text";

export interface PagedAdvancedFilterOption {
  label: string;
  value: string;
}

export interface PagedAdvancedFilterFieldConfig {
  value: string;
  label: string;
  type?: "text" | "number" | "select" | "boolean";
  operators?: string[];
  placeholder?: string;
  options?: PagedAdvancedFilterOption[];
  keyboardType?: "default" | "numeric";
}

export interface PagedAdvancedFilterRow {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface PagedAdvancedFilterBuilderProps {
  fields: readonly PagedAdvancedFilterFieldConfig[];
  rows: PagedAdvancedFilterRow[];
  onRowsChange: (rows: PagedAdvancedFilterRow[]) => void;
  defaultField?: string;
}

type PickerState =
  | { type: "field"; rowId: string }
  | { type: "operator"; rowId: string }
  | { type: "value"; rowId: string }
  | null;

const DEFAULT_OPERATORS_BY_TYPE: Record<string, string[]> = {
  text: ["contains", "startsWith", "endsWith", "eq"],
  number: ["eq", "gt", "gte", "lt", "lte"],
  select: ["eq"],
  boolean: ["eq"],
};

function createId(): string {
  return `mobile-filter-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getDefaultOperatorForField(
  fieldValue: string,
  fields: readonly PagedAdvancedFilterFieldConfig[]
): string {
  const field = fields.find((item) => item.value === fieldValue);
  if (!field) return "contains";
  const operators = field.operators?.length
    ? field.operators
    : DEFAULT_OPERATORS_BY_TYPE[field.type ?? "text"] ?? ["contains"];
  return operators[0] ?? "contains";
}

export function createPagedAdvancedFilterRow(
  fields: readonly PagedAdvancedFilterFieldConfig[],
  defaultField?: string
): PagedAdvancedFilterRow {
  const firstField = defaultField ?? fields[0]?.value ?? "";
  return {
    id: createId(),
    field: firstField,
    operator: getDefaultOperatorForField(firstField, fields),
    value: "",
  };
}

export function mapPagedAdvancedFilterRowsToFilters(
  rows: readonly PagedAdvancedFilterRow[]
): Array<{ column: string; operator: string; value: string }> {
  return rows
    .filter((row) => row.field.trim() && row.value.toString().trim() !== "")
    .map((row) => ({
      column: row.field,
      operator: row.operator,
      value: row.value.toString().trim(),
    }));
}

export function PagedAdvancedFilterBuilder({
  fields,
  rows,
  onRowsChange,
  defaultField,
}: PagedAdvancedFilterBuilderProps): React.ReactElement {
  const { t } = useTranslation();
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";
  const [pickerState, setPickerState] = useState<PickerState>(null);

  const theme = {
    text: isDark ? "#E2E8F0" : "#0F172A",
    textMuted: isDark ? "#94A3B8" : "#64748B",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.18)",
    softBg: isDark ? "rgba(255,255,255,0.045)" : "#F8FAFC",
    rowBg: isDark ? "rgba(255,255,255,0.03)" : "#FFFFFF",
    accent: "#db2777",
    overlay: "rgba(0,0,0,0.48)",
    sheet: isDark ? "#1E293B" : "#FFFFFF",
  };

  const getFieldConfig = (fieldValue: string) =>
    fields.find((field) => field.value === fieldValue) ?? fields[0];

  const getOperatorsForField = (fieldValue: string) => {
    const field = getFieldConfig(fieldValue);
    return field?.operators?.length
      ? field.operators
      : DEFAULT_OPERATORS_BY_TYPE[field?.type ?? "text"] ?? ["contains"];
  };

  const getOperatorLabel = (operator: string) => {
    const labels: Record<string, string> = {
      contains: t("common.advancedFilter.operatorContains", "İçerir"),
      startsWith: t("common.advancedFilter.operatorStartsWith", "Şununla başlar"),
      endsWith: t("common.advancedFilter.operatorEndsWith", "Şununla biter"),
      eq: t("common.advancedFilter.operatorEquals", "Eşittir"),
      equals: t("common.advancedFilter.operatorEquals", "Eşittir"),
      gt: ">",
      gte: ">=",
      lt: "<",
      lte: "<=",
    };
    return labels[operator] ?? operator;
  };

  const selectedRow = pickerState ? rows.find((row) => row.id === pickerState.rowId) ?? null : null;
  const selectedField = selectedRow ? getFieldConfig(selectedRow.field) : null;

  const pickerOptions = useMemo(() => {
    if (!pickerState || !selectedRow) return [];
    if (pickerState.type === "field") {
      return fields.map((field) => ({ label: field.label, value: field.value }));
    }
    if (pickerState.type === "operator") {
      return getOperatorsForField(selectedRow.field).map((operator) => ({
        label: getOperatorLabel(operator),
        value: operator,
      }));
    }
    if (pickerState.type === "value" && selectedField?.type === "boolean") {
      return [
        { label: t("common.true", "Evet"), value: "true" },
        { label: t("common.false", "Hayır"), value: "false" },
      ];
    }
    if (pickerState.type === "value" && selectedField?.options) {
      return selectedField.options;
    }
    return [];
  }, [fields, pickerState, selectedField, selectedRow, t]);

  const updateRow = (rowId: string, patch: Partial<Omit<PagedAdvancedFilterRow, "id">>) => {
    onRowsChange(
      rows.map((row) => {
        if (row.id !== rowId) return row;
        const next = { ...row, ...patch };
        if (patch.field && patch.field !== row.field) {
          next.operator = getDefaultOperatorForField(patch.field, fields);
          next.value = "";
        }
        return next;
      })
    );
  };

  const addRow = () => {
    onRowsChange([...rows, createPagedAdvancedFilterRow(fields, defaultField)]);
  };

  const removeRow = (rowId: string) => {
    onRowsChange(rows.filter((row) => row.id !== rowId));
  };

  const handlePickerSelect = (value: string) => {
    if (!pickerState || !selectedRow) return;
    if (pickerState.type === "field") {
      updateRow(selectedRow.id, { field: value });
    } else if (pickerState.type === "operator") {
      updateRow(selectedRow.id, { operator: value });
    } else if (pickerState.type === "value") {
      updateRow(selectedRow.id, { value });
    }
    setPickerState(null);
  };

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={[styles.helperText, { color: theme.textMuted }]}>
          {t("common.advancedFilter.title", "Gelişmiş Filtre")}
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.softBg, borderColor: theme.border }]}
          onPress={addRow}
          activeOpacity={0.72}
        >
          <Add01Icon size={18} color={theme.accent} variant="stroke" />
          <Text style={[styles.addButtonText, { color: theme.accent }]}>
            {t("common.advancedFilter.add", "Filtre Ekle")}
          </Text>
        </TouchableOpacity>
      </View>

      {rows.length === 0 ? (
        <View style={[styles.emptyState, { borderColor: theme.border, backgroundColor: theme.softBg }]}>
          <Text style={[styles.emptyStateText, { color: theme.textMuted }]}>
            {t("common.advancedFilter.empty", "Henüz filtre eklenmedi.")}
          </Text>
        </View>
      ) : (
        rows.map((row, index) => {
          const field = getFieldConfig(row.field);
          const valueOptions =
            field?.type === "boolean"
              ? [
                  { label: t("common.true", "Evet"), value: "true" },
                  { label: t("common.false", "Hayır"), value: "false" },
                ]
              : field?.options;
          const selectedValueLabel =
            valueOptions?.find((option) => option.value === row.value)?.label ?? row.value;

          return (
            <View
              key={row.id}
              style={[
                styles.rowCard,
                {
                  backgroundColor: theme.rowBg,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.rowHeader}>
                <Text style={[styles.rowTitle, { color: theme.textMuted }]}>
                  {t("common.advancedFilter.ruleLabel", { index: index + 1, defaultValue: `Kural ${index + 1}` })}
                </Text>
                <TouchableOpacity onPress={() => removeRow(row.id)} style={styles.removeButton}>
                  <Delete02Icon size={18} color={theme.textMuted} variant="stroke" />
                </TouchableOpacity>
              </View>

              <View style={styles.fieldStack}>
                <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>
                  {t("common.advancedFilter.column", "Alan")}
                </Text>
                <TouchableOpacity
                  style={[styles.selectButton, { backgroundColor: theme.softBg, borderColor: theme.border }]}
                  onPress={() => setPickerState({ type: "field", rowId: row.id })}
                  activeOpacity={0.72}
                >
                  <Text style={[styles.selectButtonText, { color: theme.text }]}>
                    {field?.label ?? row.field}
                  </Text>
                  <ArrowDown01Icon size={18} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.fieldStack}>
                <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>
                  {t("common.advancedFilter.operator", "Operatör")}
                </Text>
                <TouchableOpacity
                  style={[styles.selectButton, { backgroundColor: theme.softBg, borderColor: theme.border }]}
                  onPress={() => setPickerState({ type: "operator", rowId: row.id })}
                  activeOpacity={0.72}
                >
                  <Text style={[styles.selectButtonText, { color: theme.text }]}>
                    {getOperatorLabel(row.operator)}
                  </Text>
                  <ArrowDown01Icon size={18} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.fieldStack}>
                <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>
                  {t("common.advancedFilter.value", "Değer")}
                </Text>
                {valueOptions ? (
                  <TouchableOpacity
                    style={[styles.selectButton, { backgroundColor: theme.softBg, borderColor: theme.border }]}
                    onPress={() => setPickerState({ type: "value", rowId: row.id })}
                    activeOpacity={0.72}
                  >
                    <Text
                      style={[
                        styles.selectButtonText,
                        { color: row.value ? theme.text : theme.textMuted },
                      ]}
                    >
                      {row.value ? selectedValueLabel : field?.placeholder ?? t("common.advancedFilter.value", "Değer")}
                    </Text>
                    <ArrowDown01Icon size={18} color={theme.textMuted} />
                  </TouchableOpacity>
                ) : (
                  <TextInput
                    value={row.value}
                    onChangeText={(value) => updateRow(row.id, { value })}
                    placeholder={field?.placeholder ?? t("common.advancedFilter.value", "Değer")}
                    placeholderTextColor={theme.textMuted}
                    keyboardType={field?.keyboardType ?? (field?.type === "number" ? "numeric" : "default")}
                    style={[
                      styles.input,
                      {
                        color: theme.text,
                        backgroundColor: theme.softBg,
                        borderColor: theme.border,
                      },
                    ]}
                  />
                )}
              </View>
            </View>
          );
        })
      )}

      <Modal
        visible={pickerState !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerState(null)}
      >
        <View style={[styles.pickerOverlay, { backgroundColor: theme.overlay }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setPickerState(null)} />
          <View style={[styles.pickerSheet, { backgroundColor: theme.sheet, borderColor: theme.border }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: theme.text }]}>
                {pickerState?.type === "field"
                  ? t("common.advancedFilter.column", "Alan")
                  : pickerState?.type === "operator"
                    ? t("common.advancedFilter.operator", "Operatör")
                    : t("common.advancedFilter.value", "Değer")}
              </Text>
              <TouchableOpacity onPress={() => setPickerState(null)}>
                <Cancel01Icon size={22} color={theme.textMuted} variant="stroke" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.pickerScroll} keyboardShouldPersistTaps="handled">
              {pickerOptions.map((option) => {
                const isSelected =
                  pickerState?.type === "field"
                    ? selectedRow?.field === option.value
                    : pickerState?.type === "operator"
                      ? selectedRow?.operator === option.value
                      : selectedRow?.value === option.value;

                return (
                  <TouchableOpacity
                    key={`${pickerState?.type}-${option.value}`}
                    style={[
                      styles.pickerOption,
                      {
                        borderColor: isSelected ? theme.accent : theme.border,
                        backgroundColor: isSelected ? `${theme.accent}14` : theme.softBg,
                      },
                    ]}
                    onPress={() => handlePickerSelect(option.value)}
                    activeOpacity={0.72}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        { color: isSelected ? theme.accent : theme.text },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  helperText: {
    fontSize: 13,
    fontWeight: "600",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addButtonText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: "700",
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  emptyStateText: {
    fontSize: 14,
  },
  rowCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  rowTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  removeButton: {
    padding: 4,
  },
  fieldStack: {
    marginTop: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 2,
  },
  selectButton: {
    height: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
    marginRight: 12,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  pickerSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: "70%",
    borderWidth: 1,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  pickerScroll: {
    maxHeight: 420,
  },
  pickerOption: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
