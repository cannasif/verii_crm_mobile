import React, { useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type TextInputProps,
} from "react-native";
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
  returnKeyType?: TextInputProps["returnKeyType"];
  blurOnSubmit?: boolean;
  onSubmitEditing?: TextInputProps["onSubmitEditing"];
  onKeyPress?: TextInputProps["onKeyPress"];
  onInputFocus?: () => void;
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
  returnKeyType,
  blurOnSubmit,
  onSubmitEditing,
  onKeyPress,
  onInputFocus,
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
    error: "#ef4444"
  };

  const getBorderColor = () => {
    if (error) return THEME.error;
    if (isFocused) return THEME.focusBorder;
    return THEME.border;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.labelContainer}>
        <Text style={[styles.label, { color: THEME.label }]} numberOfLines={1}>{label}</Text>
        {required && <Text style={[styles.required, { color: THEME.error }]}>*</Text>}
      </View>
      
      <TextInput
        ref={inputRef} // <-- Buraya bağladık
        style={[
          styles.input,
          {
            backgroundColor: THEME.inputBg,
            borderColor: getBorderColor(),
            color: THEME.text,
          },
          multiline && { 
            minHeight: 80, 
            textAlignVertical: "top", 
            paddingTop: 10 
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
        onFocus={() => {
          setIsFocused(true);
          onInputFocus?.();
        }}
        onBlur={() => setIsFocused(false)}
        returnKeyType={returnKeyType}
        blurOnSubmit={blurOnSubmit ?? (multiline ? false : Boolean(onSubmitEditing))}
        onSubmitEditing={onSubmitEditing}
        onKeyPress={onKeyPress}
      />
      
      {error && <Text style={[styles.error, { color: THEME.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 0 },
  labelContainer: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  label: { fontSize: 11, fontWeight: "600" },
  required: { fontSize: 11, marginLeft: 2 },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: "500",
    includeFontPadding: false,
  },
  inputDisabled: { opacity: 0.6, backgroundColor: "rgba(0,0,0,0.02)" },
  error: { fontSize: 10, marginTop: 2, fontWeight: "500" },
});
