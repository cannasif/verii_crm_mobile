import React, { useCallback, useState, useEffect, useMemo } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from "react-native";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUIStore } from "../../../store/ui";
import type { StockRelationDto } from "../../stocks/types/stock";

interface RelatedStocksSelectDialogProps {
  visible: boolean;
  relations: StockRelationDto[];
  onClose: () => void;
  onConfirm: (selectedStockIds: number[]) => void;
}

export function RelatedStocksSelectDialog({
  visible,
  relations,
  onClose,
  onConfirm,
}: RelatedStocksSelectDialogProps): React.ReactElement {
  const { colors } = useUIStore();
  const insets = useSafeAreaInsets();

  const mandatoryRelations = useMemo(
    () => relations.filter((r) => r.isMandatory),
    [relations]
  );
  const optionalRelations = useMemo(
    () => relations.filter((r) => !r.isMandatory),
    [relations]
  );

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (visible) {
      const mandatoryIds = new Set(mandatoryRelations.map((r) => r.relatedStockId));
      setSelectedIds(mandatoryIds);
    }
  }, [visible, mandatoryRelations]);

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
    mandatoryRelations.forEach((r) => orderedIds.push(r.relatedStockId));
    optionalRelations.forEach((r) => {
      if (selectedIds.has(r.relatedStockId)) orderedIds.push(r.relatedStockId);
    });
    onConfirm(orderedIds);
    onClose();
  }, [mandatoryRelations, optionalRelations, selectedIds, onConfirm, onClose]);

  const renderRelationRow = useCallback(
    (relation: StockRelationDto, disabled: boolean) => {
      const isChecked = selectedIds.has(relation.relatedStockId);
      const name = relation.relatedStockName || relation.relatedStockCode || `#${relation.relatedStockId}`;

      return (
        <View
          key={relation.id}
          style={[styles.row, { borderBottomColor: colors.border }]}
        >
          <TouchableOpacity
            style={[
              styles.checkbox,
              { borderColor: colors.border, backgroundColor: isChecked ? colors.accent + "30" : "transparent" },
            ]}
            onPress={() => !disabled && toggleOptional(relation.relatedStockId)}
            disabled={disabled}
          >
            {isChecked && <Text style={[styles.checkmark, { color: colors.accent }]}>✓</Text>}
          </TouchableOpacity>
          <View style={styles.rowContent}>
            <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
              Miktar: {relation.quantity}
              {relation.description ? ` · ${relation.description}` : ""}
            </Text>
          </View>
          {disabled && (
            <View style={[styles.badge, { backgroundColor: "#10B98120" }]}>
              <Text style={[styles.badgeText, { color: "#10B981" }]}>Zorunlu</Text>
            </View>
          )}
        </View>
      );
    },
    [selectedIds, colors, toggleOptional]
  );

  if (!visible) return <></>;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.content,
            { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Bağlı Stokları Seçin</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeText, { color: colors.text }]}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Ana stok ile birlikte eklemek istediğiniz bağlı stokları seçin. Zorunlu stoklar otomatik olarak seçilidir.
          </Text>

          <FlatListScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {mandatoryRelations.length > 0 && (
              <View style={styles.block}>
                <Text style={[styles.blockTitle, { color: colors.textSecondary }]}>Zorunlu</Text>
                {mandatoryRelations.map((r) => renderRelationRow(r, true))}
              </View>
            )}
            {optionalRelations.length > 0 && (
              <View style={styles.block}>
                <Text style={[styles.blockTitle, { color: colors.textSecondary }]}>Opsiyonel</Text>
                {optionalRelations.map((r) => renderRelationRow(r, false))}
              </View>
            )}
          </FlatListScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelText, { color: colors.text }]}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.accent }]}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmText}>Ekle</Text>
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  content: {
    height: "70%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    fontSize: 20,
    fontWeight: "300",
  },
  description: {
    fontSize: 13,
    paddingHorizontal: 20,
    paddingVertical: 12,
    lineHeight: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 24,
  },
  block: {
    marginBottom: 20,
  },
  blockTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  checkmark: {
    fontSize: 14,
    fontWeight: "700",
  },
  rowContent: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    fontWeight: "500",
  },
  rowMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
  },
  confirmBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
