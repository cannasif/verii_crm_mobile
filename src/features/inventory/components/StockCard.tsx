import React, { memo } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import type { StockGetDto } from "../types/stock";

interface StockCardProps {
  stock: StockGetDto;
  onPress: () => void;
}

function StockCardComponent({ stock, onPress }: StockCardProps): React.ReactElement {
  const { colors } = useUIStore();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {stock.stockName}
          </Text>
          {stock.erpStockCode && (
            <Text style={[styles.code, { color: colors.textMuted }]}>
              {stock.erpStockCode}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.details}>
        {stock.unit && (
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📦</Text>
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {stock.unit}
            </Text>
          </View>
        )}
        {stock.ureticiKodu && (
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🏭</Text>
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {stock.ureticiKodu}
            </Text>
          </View>
        )}
        {stock.branchCode && (
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🏢</Text>
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              Şube: {stock.branchCode}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export const StockCard = memo(StockCardComponent);

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  code: {
    fontSize: 12,
  },
  details: {
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailIcon: {
    fontSize: 14,
    marginRight: 8,
    width: 20,
  },
  detailText: {
    fontSize: 14,
    flex: 1,
  },
});
