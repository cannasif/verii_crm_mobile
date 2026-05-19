import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { Text } from "@/components/ui/text";
import { useUIStore } from "@/store/ui";
import type { StockRelationDto } from "@/features/stocks/types";
import { useTranslation } from "react-i18next";

interface CatalogRelatedStocksDialogProps {
  visible: boolean;
  relations: StockRelationDto[];
  onClose: () => void;
  onConfirm: (selectedStockIds: number[]) => void;
}

export function CatalogRelatedStocksDialog({
  visible,
  relations,
  onClose,
  onConfirm,
}: CatalogRelatedStocksDialogProps): React.ReactElement {
  const { colors } = useUIStore();
  const { t } = useTranslation();

  const mandatoryRelations = useMemo(() => relations.filter((relation) => relation.isMandatory), [relations]);
  const optionalRelations = useMemo(() => relations.filter((relation) => !relation.isMandatory), [relations]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!visible) return;
    setSelectedIds(new Set(mandatoryRelations.map((relation) => relation.relatedStockId)));
  }, [mandatoryRelations, visible]);

  const toggleOptional = useCallback((relatedStockId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(relatedStockId)) {
        next.delete(relatedStockId);
      } else {
        next.add(relatedStockId);
      }
      return next;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    const orderedIds: number[] = [];
    mandatoryRelations.forEach((relation) => orderedIds.push(relation.relatedStockId));
    optionalRelations.forEach((relation) => {
      if (selectedIds.has(relation.relatedStockId)) {
        orderedIds.push(relation.relatedStockId);
      }
    });
    onConfirm(orderedIds);
  }, [mandatoryRelations, onConfirm, optionalRelations, selectedIds]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{t("stockPicker.relatedStocksTitle")}</Text>
          <FlatListScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {mandatoryRelations.map((relation) => {
              const name = relation.relatedStockName || relation.relatedStockCode || `#${relation.relatedStockId}`;
              return (
                <View key={relation.id} style={[styles.row, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.rowText, { color: colors.text }]}>{name}</Text>
                  <Text style={[styles.mandatory, { color: colors.accent }]}>{t("stockPicker.relatedMandatory")}</Text>
                </View>
              );
            })}
            {optionalRelations.map((relation) => {
              const isChecked = selectedIds.has(relation.relatedStockId);
              const name = relation.relatedStockName || relation.relatedStockCode || `#${relation.relatedStockId}`;
              return (
                <TouchableOpacity
                  key={relation.id}
                  style={[styles.row, { borderBottomColor: colors.border }]}
                  onPress={() => toggleOptional(relation.relatedStockId)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.rowText, { color: colors.text }]}>{name}</Text>
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: colors.border, backgroundColor: isChecked ? colors.accent : "transparent" },
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </FlatListScrollView>
          <View style={styles.footer}>
            <TouchableOpacity style={[styles.button, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={{ color: colors.text }}>{t("common.cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }]} onPress={handleConfirm}>
              <Text style={{ color: "#fff" }}>{t("common.confirm")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", padding: 20 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, maxHeight: "80%" },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  list: { maxHeight: 360 },
  listContent: { paddingBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  rowText: { flex: 1, fontSize: 15, fontWeight: "600" },
  mandatory: { fontSize: 12, fontWeight: "700" },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1 },
  footer: { flexDirection: "row", gap: 10, marginTop: 12 },
  button: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
});
