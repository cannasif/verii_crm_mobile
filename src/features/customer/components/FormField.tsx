import React, { useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Mic01Icon } from "hugeicons-react-native";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad" | "decimal-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  editable?: boolean;
  maxLength?: number;
  containerStyle?: StyleProp<ViewStyle>;
  inputRef?: React.Ref<TextInput>;
  enableSpeechToText?: boolean;
  onPressSpeechToText?: () => void;
  isListening?: boolean;
}

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  required = false,
  multiline = false,
  numberOfLines = 1,
  keyboardType = "default",
  autoCapitalize = "sentences",
  editable = true,
  maxLength,
  containerStyle,
  inputRef,
  enableSpeechToText = false,
  onPressSpeechToText,
  isListening = false,
}: FormFieldProps): React.ReactElement {
  const { colors, themeMode } = useUIStore();
  const [isFocused, setIsFocused] = useState(false);

  const isDark = themeMode === "dark";

  const THEME = {
    label: isDark ? "#94a3b8" : colors.textSecondary,
    inputBg: isDark ? "rgba(255,255,255,0.05)" : colors.backgroundSecondary,
    border: isDark ? "rgba(255,255,255,0.1)" : colors.border,
    focusBorder: "#db2777",
    text: isDark ? "#FFFFFF" : colors.text,
    placeholder: isDark ? "#64748B" : colors.textMuted,
    error: "#ef4444",
    micBg: isDark ? "rgba(219, 39, 119, 0.12)" : "#FFF1F6",
    micBorder: isDark ? "rgba(219, 39, 119, 0.35)" : "rgba(219, 39, 119, 0.18)",
    micIcon: "#db2777",
  };

  const getBorderColor = () => {
    if (error) return THEME.error;
    if (isFocused) return THEME.focusBorder;
    return THEME.border;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.labelContainer}>
        <Text style={[styles.label, { color: THEME.label }]} numberOfLines={1}>
          {label}
        </Text>
        {required && <Text style={[styles.required, { color: THEME.error }]}>*</Text>}
      </View>
      <View style={styles.inputWrapper}>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              backgroundColor: THEME.inputBg,
              borderColor: getBorderColor(),
              color: THEME.text,
              paddingRight: enableSpeechToText ? 50 : 12,
            },
            multiline && {
              minHeight: 80,
              textAlignVertical: "top",
              paddingTop: 10,
            },
            !editable && styles.inputDisabled,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={THEME.placeholder}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          maxLength={maxLength}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        {enableSpeechToText && editable && onPressSpeechToText ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPressSpeechToText}
            disabled={isListening}
            style={[
              styles.micButton,
              {
                backgroundColor: THEME.micBg,
                borderColor: THEME.micBorder,
                top: multiline ? 10 : 7,
              },
            ]}
          >
            {isListening ? (
              <ActivityIndicator size="small" color={THEME.micIcon} />
            ) : (
              <Mic01Icon size={16} color={THEME.micIcon} variant="stroke" />
            )}
          </TouchableOpacity>
        ) : null}
      </View>

      {error && <Text style={[styles.error, { color: THEME.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 0 },
  labelContainer: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  label: { fontSize: 11, fontWeight: "600" },
  required: { fontSize: 11, marginLeft: 2 },
  inputWrapper: {
    position: "relative",
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: "500",
    includeFontPadding: false,
  },
  micButton: {
    position: "absolute",
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  inputDisabled: { opacity: 0.6, backgroundColor: "rgba(0,0,0,0.02)" },
  error: { fontSize: 10, marginTop: 2, fontWeight: "500" },
});