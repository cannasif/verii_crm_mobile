import React from "react";
import { View, StyleSheet } from "react-native";
import { Add01Icon, Invoice01Icon } from "hugeicons-react-native";

interface QuotationCreateToolbarIconProps {
  color: string;
  badgeBorderColor: string;
}

export function QuotationCreateToolbarIcon({
  color,
  badgeBorderColor,
}: QuotationCreateToolbarIconProps): React.ReactElement {
  return (
    <View style={styles.wrap}>
      <Invoice01Icon size={20} color={color} variant="stroke" strokeWidth={2.3} />
      <View
        style={[
          styles.plusBadge,
          {
            backgroundColor: color,
            borderColor: badgeBorderColor,
          },
        ]}
      >
        <Add01Icon size={9} color="#FFFFFF" variant="stroke" strokeWidth={3} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  plusBadge: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
