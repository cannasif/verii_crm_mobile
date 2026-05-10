import React from "react";
import { StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { useUIStore } from "../../../store/ui";
import { useSpeechToText } from "../hooks/useSpeechToText";
import { Mic01Icon, StopIcon } from "hugeicons-react-native";

interface SalesmanPickerVoiceButtonProps {
  onResult: (text: string) => void;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export function SalesmanPickerVoiceButton({
  onResult,
  disabled = false,
  containerStyle,
}: SalesmanPickerVoiceButtonProps): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useUIStore();
  const { startListening, isListening } = useSpeechToText();

  const handlePress = () => {
    if (disabled) return;
    void startListening(onResult);
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        containerStyle == null && !isListening
          ? { backgroundColor: colors.card, borderColor: colors.border }
          : null,
        containerStyle,
        isListening
          ? { backgroundColor: colors.activeBackground, borderColor: colors.accent, borderWidth: 2 }
          : null,
        disabled && styles.buttonDisabled,
      ]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.78}
      accessibilityLabel={t("salesman360.salesmanFilter.voiceSearchA11y")}
    >
      {isListening ? (
        <StopIcon size={16} color={colors.accent} variant="stroke" strokeWidth={2} />
      ) : (
        <Mic01Icon size={16} color={colors.textMuted} variant="stroke" strokeWidth={1.9} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});
