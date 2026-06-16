import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { windoDefinitionApi } from "../api/windoDefinitionApi";
import { WINDO_DEFINITION_QUERY_ROOT } from "../hooks/useWindoDefinitionOptions";
import type { WindoDefinitionDto } from "../types";

interface BaskiQuickCreateModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (item: WindoDefinitionDto) => void;
}

export function BaskiQuickCreateModal({
  visible,
  onClose,
  onCreated,
}: BaskiQuickCreateModalProps): React.ReactElement {
  const { colors, themeMode } = useUIStore();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const isDark = themeMode === "dark";
  const mainBg = isDark ? "#161224" : colors.card;
  const inputBg = isDark ? "rgba(255,255,255,0.03)" : colors.backgroundSecondary;
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : colors.border;
  const textColor = isDark ? "#F8FAFC" : colors.text;
  const mutedColor = isDark ? "#94A3B8" : colors.textSecondary;

  useEffect(() => {
    if (!visible) setName("");
  }, [visible]);

  const createMutation = useMutation({
    mutationFn: (trimmedName: string) =>
      windoDefinitionApi.createBaskiDefinition({
        name: trimmedName,
        profilDefinitionId: null,
      }),
    onSuccess: async (item) => {
      await queryClient.invalidateQueries({ queryKey: WINDO_DEFINITION_QUERY_ROOT });
      onCreated(item);
      setName("");
      onClose();
    },
    onError: (error: Error) => {
      Alert.alert("Baskı oluşturulamadı", error.message || "Lütfen tekrar deneyin.");
    },
  });

  const handleSave = (): void => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert("Eksik bilgi", "Baskı adı zorunludur.");
      return;
    }

    createMutation.mutate(trimmedName);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalContent, { backgroundColor: mainBg, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
            <View style={[styles.handle, { backgroundColor: borderColor }]} />
            <Text style={[styles.modalTitle, { color: textColor }]}>Yeni Baskı Ekle</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: textColor }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={[styles.label, { color: mutedColor }]}>Baskı adı</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
              value={name}
              onChangeText={setName}
              placeholder="Örn. Lazer baskılı"
              placeholderTextColor={mutedColor}
              maxLength={150}
              autoCapitalize="sentences"
            />

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor }]}
                onPress={onClose}
                disabled={createMutation.isPending}
              >
                <Text style={[styles.cancelText, { color: textColor }]}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.accent }]}
                onPress={handleSave}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveText}>Kaydet</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    overflow: "hidden",
  },
  modalHeader: {
    alignItems: "center",
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  handle: {
    borderRadius: 999,
    height: 4,
    marginBottom: 12,
    width: 42,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  closeButton: {
    padding: 8,
    position: "absolute",
    right: 14,
    top: 14,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: "700",
  },
  content: {
    gap: 12,
    padding: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
    marginTop: 8,
  },
  cancelButton: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 92,
    paddingHorizontal: 16,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "700",
  },
  saveButton: {
    alignItems: "center",
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 104,
    paddingHorizontal: 18,
  },
  saveText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
});
