import React, { memo, useMemo } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import {
  StockBrowseGridCard,
  StockBrowseListRow,
  stockBrowseStyles,
  type StockBrowseItemFields,
} from "@/components/shared/stock-browse";
import { Text } from "@/components/ui/text";
import { WarehouseBalanceBadge } from "@/features/warehouse-stock-balances";
import { getImageUrl } from "@/lib/getImageUrl";
import { formatSystemNumber } from "@/lib/systemSettings";
import { useUIStore } from "@/store/ui";
import type { StockGetDto } from "../types";

export interface StockCardUnitPrice {
  listPrice: number;
  currency: string;
}

interface StockCardProps {
  item: StockGetDto;
  viewMode: "grid" | "list";
  gridWidth: number;
  unitPriceInfo?: StockCardUnitPrice | null;
  unitPriceLoading?: boolean;
  balanceFetchEnabled?: boolean;
}

interface CurrencyUi {
  symbol: string;
  label: string;
}

function safeText(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function resolveCurrencyUi(raw: string | undefined | null): CurrencyUi {
  const s = String(raw ?? "").trim();
  if (!s) return { symbol: "₺", label: "TL" };

  const u = s.toUpperCase();

  if (u === "TRY" || u === "TRL" || u === "TL" || u === "YTL") {
    return { symbol: "₺", label: "TL" };
  }
  if (u === "USD" || u === "US" || u === "DOLAR" || u === "DOLLAR") {
    return { symbol: "$", label: "Dolar" };
  }
  if (u === "EUR" || u === "EURO") {
    return { symbol: "€", label: "Euro" };
  }
  if (u === "GBP" || u === "STERLIN" || u === "STERLİN" || u === "POUND") {
    return { symbol: "£", label: "Sterlin" };
  }
  if (u === "CHF") {
    return { symbol: "Fr.", label: "CHF" };
  }

  if (/^\d+$/.test(s)) {
    const byNum: Record<string, CurrencyUi> = {
      "0": { symbol: "₺", label: "TL" },
      "1": { symbol: "₺", label: "TL" },
      "2": { symbol: "$", label: "Dolar" },
      "3": { symbol: "€", label: "Euro" },
      "4": { symbol: "£", label: "Sterlin" },
    };
    return byNum[s] ?? { symbol: "₺", label: "TL" };
  }

  return { symbol: "", label: s };
}

function formatPriceCompact(info: StockCardUnitPrice): string {
  const amount = formatSystemNumber(info.listPrice, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const { symbol, label } = resolveCurrencyUi(info.currency);
  if (symbol) return `${amount}${symbol}`;
  return label ? `${amount} ${label}` : amount;
}

function mapStockToBrowseItem(item: StockGetDto): StockBrowseItemFields {
  const primaryImage =
    item.stockImages?.find((img) => img.isPrimary && img.filePath) ??
    item.stockImages?.find((img) => img.filePath);

  return {
    erpStockCode: safeText(item.erpStockCode, "-"),
    stockName: safeText(item.stockName, "-"),
    unit: item.unit?.trim() || undefined,
    imageUrl: primaryImage?.filePath ? getImageUrl(primaryImage.filePath) : undefined,
    grupKodu: item.grupKodu,
    grupAdi: item.grupAdi,
    kod1: item.kod1,
    kod1Adi: item.kod1Adi,
  };
}

function resolvePriceLabel(
  item: StockGetDto,
  unitPriceInfo: StockCardUnitPrice | null | undefined,
  unitPriceLoading: boolean
): string | null {
  const code = (item.erpStockCode ?? "").trim();
  if (!code) return null;
  if (unitPriceLoading) return "…";
  if (unitPriceInfo && Number.isFinite(unitPriceInfo.listPrice)) {
    return formatPriceCompact(unitPriceInfo);
  }

  return null;
}

const StockCardComponent = ({
  item,
  viewMode,
  gridWidth,
  unitPriceInfo = null,
  unitPriceLoading = false,
  balanceFetchEnabled = false,
}: StockCardProps): React.ReactElement => {
  const router = useRouter();
  const { colors, themeMode } = useUIStore();
  const isDark = themeMode === "dark";
  const browseItem = useMemo(() => mapStockToBrowseItem(item), [item]);
  const frameColor = isDark ? "rgba(255, 255, 255, 0.2)" : colors.border;
  const surfaceColor = isDark ? "rgba(255, 255, 255, 0.06)" : colors.card;
  const priceLabel = resolvePriceLabel(item, unitPriceInfo, unitPriceLoading);
  const priceColor = isDark ? "#CBD5E1" : colors.textSecondary;

  const handlePress = () => {
    router.push(`/(tabs)/stock/${item.id}`);
  };

  const priceNode =
    priceLabel != null ? (
      <Text unstyled disableThemeColor style={[stockBrowseStyles.cardBodyExtra, { color: priceColor }]}>
        {priceLabel}
      </Text>
    ) : null;

  const balanceBadge = (
    <WarehouseBalanceBadge
      stockId={item.id}
      unit={item.unit}
      isDark={isDark}
      compact={viewMode === "list"}
      fetchEnabled={balanceFetchEnabled}
    />
  );

  const listMetaRow =
    priceLabel != null ? (
      <Text unstyled disableThemeColor style={[stockBrowseStyles.listMetaText, { color: priceColor }]}>
        {priceLabel}
      </Text>
    ) : undefined;

  if (viewMode === "grid") {
    return (
      <View style={{ width: gridWidth }}>
        <StockBrowseGridCard
          item={browseItem}
          colors={colors}
          isDark={isDark}
          frameColor={frameColor}
          surfaceColor={surfaceColor}
          onPress={handlePress}
          imageOverlay={balanceBadge}
          bodyExtra={priceNode}
        />
      </View>
    );
  }

  return (
    <StockBrowseListRow
      item={browseItem}
      colors={colors}
      frameColor={frameColor}
      isDark={isDark}
      onPress={handlePress}
      prefixActions={balanceBadge}
      metaRow={listMetaRow}
    />
  );
};

export const StockCard = memo(StockCardComponent);
