import React, { useMemo, useCallback } from "react";
import { View, StyleSheet, FlatList, Image } from "react-native";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { Text } from "../../../components/ui/text";
import type { StockGetDto, StockRelationDto, StockImageDto } from "../types/stock";

function DetailRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string | undefined | null;
  colors: Record<string, string>;
}): React.ReactElement | null {
  if (!value) return null;

  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

interface StockDetailContentProps {
  stock: StockGetDto | undefined;
  relations: StockRelationDto[];
  colors: Record<string, string>;
  insets: { bottom: number };
  t: (key: string) => string;
}

export function StockDetailContent({
  stock,
  relations,
  colors,
  insets,
  t,
}: StockDetailContentProps): React.ReactElement {
  const primaryImage = useMemo(() => {
    return stock?.stockImages?.find((img: StockImageDto) => img.isPrimary) || stock?.stockImages?.[0];
  }, [stock?.stockImages]);

  const hasBasicInfo = stock?.erpStockCode || stock?.unit || stock?.ureticiKodu;
  const hasImages = stock?.stockImages && stock.stockImages.length > 0;
  const hasRelations = relations && relations.length > 0;

  const renderImage = useCallback(
    ({ item }: { item: StockImageDto }) => {
      return (
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.filePath }} style={styles.image} resizeMode="cover" />
          {item.altText && (
            <Text style={[styles.imageAlt, { color: colors.textMuted }]}>{item.altText}</Text>
          )}
        </View>
      );
    },
    [colors]
  );

  const renderRelation = useCallback(
    ({ item }: { item: StockRelationDto }) => {
      return (
        <View style={[styles.relationCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.relationHeader}>
            <Text style={[styles.relationName, { color: colors.text }]}>
              {item.relatedStockName || t("stock.unknownStock")}
            </Text>
            {item.isMandatory && (
              <View style={[styles.mandatoryBadge, { backgroundColor: "#EF444420" }]}>
                <Text style={[styles.mandatoryText, { color: "#EF4444" }]}>
                  {t("stock.mandatory")}
                </Text>
              </View>
            )}
          </View>
          {item.relatedStockCode && (
            <Text style={[styles.relationCode, { color: colors.textMuted }]}>
              {t("stock.stockCode")}: {item.relatedStockCode}
            </Text>
          )}
          <Text style={[styles.relationQuantity, { color: colors.text }]}>
            {t("stock.quantity")}: {item.quantity}
          </Text>
          {item.description && (
            <Text style={[styles.relationDescription, { color: colors.textSecondary }]}>
              {item.description}
            </Text>
          )}
        </View>
      );
    },
    [colors, t]
  );

  return (
    <FlatListScrollView
      style={styles.tabContent}
      contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={[styles.stockName, { color: colors.text }]}>{stock?.stockName}</Text>
            {stock?.erpStockCode && (
              <Text style={[styles.stockCode, { color: colors.textMuted }]}>
                {t("stock.stockCode")}: {stock.erpStockCode}
              </Text>
            )}
          </View>
        </View>
        {stock?.branchCode && (
          <Text style={[styles.branchText, { color: colors.textMuted }]}>
            {t("stock.branchCode")}: {stock.branchCode}
          </Text>
        )}
      </View>

      {hasBasicInfo && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("stock.basicInfo")}
          </Text>
          <DetailRow label={t("stock.stockCode")} value={stock?.erpStockCode} colors={colors} />
          <DetailRow label={t("stock.unit")} value={stock?.unit} colors={colors} />
          <DetailRow label={t("stock.ureticiKodu")} value={stock?.ureticiKodu} colors={colors} />
          <DetailRow label={t("stock.branchCode")} value={String(stock?.branchCode)} colors={colors} />
        </View>
      )}

      {hasImages && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("stock.images")}
          </Text>
          <FlatList<StockImageDto>
            data={stock.stockImages}
            renderItem={renderImage}
            keyExtractor={(item) => String(item.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imagesList}
          />
        </View>
      )}

      {hasRelations && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("stock.relations")}
          </Text>
          <FlatList
            data={relations}
            renderItem={renderRelation}
            keyExtractor={(item) => String(item.id)}
            scrollEnabled={false}
          />
        </View>
      )}
    </FlatListScrollView>
  );
}

const styles = StyleSheet.create({
  tabContent: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardHeaderLeft: {
    flex: 1,
  },
  stockName: {
    fontSize: 20,
    fontWeight: "600",
  },
  stockCode: {
    fontSize: 14,
    marginTop: 4,
  },
  branchText: {
    fontSize: 13,
    marginTop: 8,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
  },
  imagesList: {
    paddingVertical: 8,
  },
  imageContainer: {
    marginRight: 12,
    borderRadius: 8,
    overflow: "hidden",
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  imageAlt: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  relationCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  relationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  relationName: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  mandatoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  mandatoryText: {
    fontSize: 11,
    fontWeight: "500",
  },
  relationCode: {
    fontSize: 13,
    marginBottom: 4,
  },
  relationQuantity: {
    fontSize: 14,
    marginBottom: 4,
  },
  relationDescription: {
    fontSize: 13,
    marginTop: 4,
  },
});
