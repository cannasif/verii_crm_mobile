import React from "react";
import { StyleSheet, View } from "react-native";

import { Text } from "../../../components/ui/text";

interface UpdateProgressBarProps {
  progress: number;
  label: string;
  trackColor: string;
  fillColor: string;
  textColor: string;
}

export function UpdateProgressBar({
  progress,
  label,
  trackColor,
  fillColor,
  textColor,
}: UpdateProgressBarProps): React.ReactElement {
  const clampedProgress = Math.min(1, Math.max(0, progress));

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text size="sm" style={{ color: textColor }}>
          {label}
        </Text>
        <Text size="sm" bold style={{ color: textColor }}>
          {`${Math.round(clampedProgress * 100)}%`}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: trackColor }]}>
        <View style={[styles.fill, { backgroundColor: fillColor, width: `${clampedProgress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  track: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
  },
});
