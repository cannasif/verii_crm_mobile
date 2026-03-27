import React, { useCallback } from "react";
import { View, StyleSheet, TextInput } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";

const MAX_NOTES = 15;
const MAX_CHAR_PER_NOTE = 100;

export interface QuotationNotesFormProps {
  notes: string[];
  onChange: (notes: string[]) => void;
  validationError?: string | null;
  editable?: boolean;
}

export function QuotationNotesForm({
  notes,
  onChange,
  validationError,
  editable = true,
}: QuotationNotesFormProps): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useUIStore();

  const paddedNotes = React.useMemo(() => {
    const arr = [...notes];
    while (arr.length < MAX_NOTES) arr.push("");
    return arr.slice(0, MAX_NOTES);
  }, [notes]);

  const handleChange = useCallback(
    (index: number, text: string) => {
      const next = [...paddedNotes];
      next[index] = text;
      onChange(next);
    },
    [paddedNotes, onChange]
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t("quotation.notesSection")}
      </Text>
      {validationError ? (
        <Text style={[styles.validationError, { color: colors.error }]}>{validationError}</Text>
      ) : null}
      {paddedNotes.map((note, index) => (
        <View key={index} style={styles.fieldContainer}>
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
              !editable && styles.inputDisabled,
            ]}
            value={note}
            onChangeText={(text) => handleChange(index, text)}
            placeholder={t("quotation.notePlaceholder")}
            placeholderTextColor={colors.textMuted}
            maxLength={MAX_CHAR_PER_NOTE}
            editable={editable}
          />
          <Text style={[styles.charCount, { color: colors.textMuted }]}>
            {note.length}/{MAX_CHAR_PER_NOTE}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  validationError: {
    fontSize: 13,
    marginBottom: 8,
  },
  fieldContainer: {
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
  inputDisabled: {
    opacity: 0.7,
  },
  charCount: {
    fontSize: 11,
    marginTop: 2,
    marginLeft: 2,
  },
});

export function notesToDto(notes: string[]): Record<string, string | undefined> {
  const dto: Record<string, string | undefined> = {};
  for (let i = 0; i < MAX_NOTES; i++) {
    const v = notes[i]?.trim();
    if (v) dto[`note${i + 1}` as keyof typeof dto] = v;
  }
  return dto;
}

export function notesFromDto(
  dto:
    | {
        note1?: string | null;
        note2?: string | null;
        note3?: string | null;
        note4?: string | null;
        note5?: string | null;
        note6?: string | null;
        note7?: string | null;
        note8?: string | null;
        note9?: string | null;
        note10?: string | null;
        note11?: string | null;
        note12?: string | null;
        note13?: string | null;
        note14?: string | null;
        note15?: string | null;
      }
    | null
): string[] {
  if (!dto) return Array(MAX_NOTES).fill("");
  const arr: string[] = [];
  for (let i = 1; i <= MAX_NOTES; i++) {
    const v = dto[`note${i}` as keyof NonNullable<typeof dto>];
    arr.push(typeof v === "string" ? v : "");
  }
  return arr;
}

export function notesToPutPayload(notes: string[]): string[] {
  return notes
    .map((n) => n.trim())
    .filter((n) => n.length > 0);
}

export function validateNotesMaxLength(notes: string[]): string | null {
  for (let i = 0; i < notes.length; i++) {
    if (notes[i].length > MAX_CHAR_PER_NOTE) {
      return `Not ${i + 1} en fazla ${MAX_CHAR_PER_NOTE} karakter olabilir.`;
    }
  }
  return null;
}
