import React, { useCallback, useEffect, useState } from "react";
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
import { useTranslation } from "react-i18next";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { validateNotesMaxLength } from "./QuotationNotesForm";

const MAX_NOTES = 15;
const MAX_CHAR_PER_NOTE = 100;

export interface QuotationNotesModalProps {
  visible: boolean;
  notes: string[];
  onSave: (notes: string[]) => void;
  onClose: () => void;
  isSaving?: boolean;
}

export function QuotationNotesModal({
  visible,
  notes,
  onSave,
  onClose,
  isSaving = false,
}: QuotationNotesModalProps): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useUIStore();
  const insets = useSafeAreaInsets();

  const [internalNotes, setInternalNotes] = useState<string[]>(Array(MAX_NOTES).fill(""));
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      const padded = [...notes];
      while (padded.length < MAX_NOTES) padded.push("");
      setInternalNotes(padded.slice(0, MAX_NOTES));
      setValidationError(null);
    }
  }, [visible, notes]);

  const handleChange = useCallback((index: number, text: string) => {
    setInternalNotes((prev) => {
      const next = [...prev];
      next[index] = text;
      return next;
    });
  }, []);

  const handleSave = useCallback(() => {
    const err = validateNotesMaxLength(internalNotes);
    if (err) {
      setValidationError(err);
      return;
    }
    setValidationError(null);
    onSave(internalNotes);
  }, [internalNotes, onSave]);

  const handleCancel = useCallback(() => {
    setValidationError(null);
    onClose();
  }, [onClose]);

  const displayNotes = React.useMemo(() => {
    const arr = [...internalNotes];
    while (arr.length < MAX_NOTES) arr.push("");
    return arr.slice(0, MAX_NOTES);
  }, [internalNotes]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleCancel} />
        <View
          style={[
            styles.content,
            { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.title, { color: colors.text }]}>
              {t("quotation.notesSection")}
            </Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeBtn}>
              <Text style={[styles.closeBtnText, { color: colors.text }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <FlatListScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {validationError ? (
              <Text style={[styles.validationError, { color: colors.error }]}>{validationError}</Text>
            ) : null}
            {displayNotes.map((note, index) => (
              <View key={index} style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {t("quotation.noteLabel", { index: index + 1, defaultValue: `Not ${index + 1}` })}
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
                  value={note}
                  onChangeText={(text) => handleChange(index, text)}
                  placeholder={t("quotation.notePlaceholder")}
                  placeholderTextColor={colors.textMuted}
                  maxLength={MAX_CHAR_PER_NOTE}
                />
                <Text style={[styles.charCount, { color: colors.textMuted }]}>
                  {note.length}/{MAX_CHAR_PER_NOTE}
                </Text>
              </View>
            ))}
          </FlatListScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={handleCancel}
              disabled={isSaving}
            >
              <Text style={[styles.cancelBtnText, { color: colors.text }]}>
                {t("common.cancel")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.accent }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <Text style={styles.saveBtnText}>
                {isSaving ? t("common.loading") : t("common.save")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  content: {
    maxHeight: "90%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  handle: {
    position: "absolute",
    top: 8,
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
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
  closeBtnText: {
    fontSize: 20,
    fontWeight: "300",
  },
  scroll: {
    maxHeight: 400,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 24,
  },
  validationError: {
    fontSize: 13,
    marginBottom: 12,
  },
  field: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 44,
  },
  charCount: {
    fontSize: 11,
    marginTop: 2,
    marginLeft: 2,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
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
  cancelBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
  saveBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
