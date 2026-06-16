import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { useUIStore } from "../../../store/ui";
import { useSpeechToText } from "../hooks/useSpeechToText";
import { Mic01Icon, StopIcon } from "hugeicons-react-native";

interface VoiceSearchButtonProps {
  onResult: (text: string) => void;
  disabled?: boolean;
}

export function VoiceSearchButton({
  onResult,
  disabled = false,
}: VoiceSearchButtonProps): React.ReactElement {
  const { colors, themeMode } = useUIStore();
  const { startListening, isListening } = useSpeechToText();

  const isDark = themeMode === "dark";
  const inputBg = isDark ? "rgba(255,255,255,0.03)" : colors.backgroundSecondary;
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : colors.border;
  const brandColor = isDark ? "#EC4899" : "#DB2777";
  const mutedColor = isDark ? "#94A3B8" : colors.textMuted;

  const handlePress = () => {
    if (disabled) return;
    startListening(onResult);
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: isListening ? (isDark ? "rgba(236, 72, 153, 0.15)" : "rgba(219, 39, 119, 0.1)") : inputBg,
          borderColor: isListening ? (isDark ? "rgba(236, 72, 153, 0.3)" : "rgba(219, 39, 119, 0.2)") : borderColor,
        },
        disabled && styles.buttonDisabled,
      ]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityLabel="Sesli arama"
    >
      {isListening ? (
        <StopIcon size={20} color={brandColor} variant="stroke" />
      ) : (
        <Mic01Icon size={20} color={mutedColor} variant="stroke" />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});