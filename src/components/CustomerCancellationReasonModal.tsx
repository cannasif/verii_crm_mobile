import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "./ui/text";

interface CustomerCancellationReasonModalProps {
  visible: boolean;
  title: string;
  description: string;
  reasonLabel: string;
  reasonPlaceholder: string;
  cancelLabel: string;
  confirmLabel: string;
  isPending?: boolean;
  colors: {
    card: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    border: string;
  };
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function CustomerCancellationReasonModal({
  visible,
  title,
  description,
  reasonLabel,
  reasonPlaceholder,
  cancelLabel,
  confirmLabel,
  isPending = false,
  colors,
  onClose,
  onConfirm,
}: CustomerCancellationReasonModalProps): React.ReactElement {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (visible) {
      setReason("");
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => !isPending && onClose()}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => !isPending && onClose()} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>{reasonLabel}</Text>
            <TextInput
              value={reason}
              onChangeText={(value) => setReason(value.slice(0, 500))}
              placeholder={reasonPlaceholder}
              placeholderTextColor={colors.textMuted}
              multiline
              editable={!isPending}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: "rgba(148,163,184,0.08)",
                },
              ]}
              textAlignVertical="top"
            />
            <Text style={[styles.counter, { color: colors.textMuted }]}>{reason.length}/500</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={onClose}
              disabled={isPending}
              activeOpacity={0.85}
            >
              <Text style={[styles.secondaryText, { color: colors.text }]}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={() => onConfirm(reason.trim())}
              disabled={isPending}
              activeOpacity={0.9}
            >
              {isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.dangerText}>{confirmLabel}</Text>
              )}
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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.58)",
    padding: 18,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  description: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
  },
  field: {
    marginTop: 18,
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    minHeight: 118,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  counter: {
    alignSelf: "flex-end",
    fontSize: 11,
    fontWeight: "600",
  },
  actions: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  secondaryButton: {
    minHeight: 44,
    minWidth: 92,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: "700",
  },
  dangerButton: {
    minHeight: 44,
    minWidth: 112,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: "#be123c",
  },
  dangerText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
