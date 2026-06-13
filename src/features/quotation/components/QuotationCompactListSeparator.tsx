import React, { memo } from "react";
import { View, StyleSheet } from "react-native";

interface QuotationCompactListSeparatorProps {
  color: string;
}

export const QuotationCompactListSeparator = memo(function QuotationCompactListSeparator({
  color,
}: QuotationCompactListSeparatorProps): React.ReactElement {
  return <View style={[styles.separator, { backgroundColor: color }]} />;
});

const styles = StyleSheet.create({
  separator: {
    height: 1.5,
    width: "100%",
    alignSelf: "stretch",
  },
});
