import React, { memo } from "react";
import { View, StyleSheet } from "react-native";

interface SalesListCompactSeparatorProps {
  color: string;
}

export const SalesListCompactSeparator = memo(function SalesListCompactSeparator({
  color,
}: SalesListCompactSeparatorProps): React.ReactElement {
  return <View style={[styles.separator, { backgroundColor: color }]} />;
});

const styles = StyleSheet.create({
  separator: {
    height: 1.5,
    width: "100%",
    alignSelf: "stretch",
  },
});
