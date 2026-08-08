import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import type { ApprovalActionGetDto } from "../types/quotation-types";

interface RejectModalProps {
  visible: boolean;
  approval: ApprovalActionGetDto | null;
  onClose: () => void;
  onConfirm: (rejectReason: string) => void;
  isPending: boolean;
}

export function RejectModal({
  visible,
  approval,
  onClose,
  onConfirm,
  isPending,
}: RejectModalProps): React.ReactElement {
  const { colors, themeMode } = useUIStore();
  const insets = useSafeAreaInsets();
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (!visible) {
      setRejectReason("");
    }
  }, [visible]);

  const handleConfirm = (): void => {
    onConfirm(rejectReason);
  };

  const modalBackground = themeMode === "dark" ? "rgba(0, 0, 0, 0.8)" : "rgba(0, 0, 0, 0.5)";
  const cardBackground = themeMode === "dark" ? "rgba(20, 10, 30, 0.95)" : "#FFFFFF";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <TouchableOpacity
          style={[styles.backdrop, { backgroundColor: modalBackground }]}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity
            style={[styles.modalContent, { backgroundColor: cardBackground }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>Teklifi Reddet</Text>
              <TouchableOpacity onPress={onClose} disabled={isPending}>
                <Text style={[styles.closeButton, { color: colors.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Red sebebini belirtiniz (opsiyonel)
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Red sebebi..."
              placeholderTextColor={colors.textMuted}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
              maxLength={500}
              editable={!isPending}
            />

            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
                ]}
                onPress={onClose}
                disabled={isPending}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>İptal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.rejectButton, { backgroundColor: colors.error }]}
                onPress={handleConfirm}
                disabled={isPending}
                activeOpacity={0.7}
              >
                <Text style={styles.rejectButtonText}>Reddet</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 500,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    fontSize: 24,
    fontWeight: "300",
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
  },
  input: {
    minHeight: 100,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  rejectButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
