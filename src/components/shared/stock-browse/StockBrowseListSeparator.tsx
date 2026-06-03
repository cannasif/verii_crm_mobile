import React, { memo } from "react";
import { View } from "react-native";
import { stockBrowseStyles as styles } from "./stockBrowseStyles";

export const StockBrowseListSeparator = memo(function StockBrowseListSeparator({
  color,
}: {
  color: string;
}) {
  return <View style={[styles.listSeparator, { backgroundColor: color }]} />;
});
