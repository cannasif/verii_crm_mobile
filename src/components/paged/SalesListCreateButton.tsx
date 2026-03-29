import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Add01Icon } from "hugeicons-react-native";

const ICON_SIZE = 26;

export interface SalesListCreateButtonProps {
  onPress: () => void;
  isDark: boolean;
  accentColor?: string;
  accessibilityLabel?: string;
}

/**
 * Liste ekle: tek Pressable = tüm 48×48 dokunulur (iç içe View yüzünden basılmama riski yok).
 * Add01Icon (Hugeicons) + hafif translateY ile optik orta.
 */
export function SalesListCreateButton({
  onPress,
  isDark: _isDark,
  accentColor = "#db2777",
  accessibilityLabel,
}: SalesListCreateButtonProps): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={({ pressed }) => [
        styles.ring,
        { borderColor: accentColor },
        pressed && { backgroundColor: `${accentColor}20` },
      ]}
    >
      <View style={styles.iconWrap} pointerEvents="none">
        <Add01Icon
          size={ICON_SIZE}
          color={accentColor}
          variant="stroke"
          strokeWidth={2}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateY: 5 }],
  },
});
