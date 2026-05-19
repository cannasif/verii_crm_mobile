import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";
import type { CatalogCampaignPricingDisplay } from "../types/catalogPicker";

interface CatalogCampaignPricingRowProps {
  pricing?: CatalogCampaignPricingDisplay;
  textColor: string;
  mutedColor: string;
  accentColor: string;
  compact?: boolean;
}

export function CatalogCampaignPricingRow({
  pricing,
  textColor,
  mutedColor,
  accentColor,
  compact = false,
}: CatalogCampaignPricingRowProps): React.ReactElement | null {
  const discountRates = useMemo(() => {
    if (!pricing) return [];
    const rates: number[] = [];
    if (pricing.discountRate1) rates.push(pricing.discountRate1);
    if (pricing.discountRate2) rates.push(pricing.discountRate2);
    if (pricing.discountRate3) rates.push(pricing.discountRate3);
    return rates;
  }, [pricing]);

  if (!pricing) return null;

  const currency = pricing.currencyCode ?? "TRY";
  const net = pricing.netPrice != null ? `${pricing.netPrice.toLocaleString("tr-TR")} ${currency}` : null;
  const reference =
    pricing.referencePrice != null && pricing.netPrice != null && pricing.referencePrice > pricing.netPrice
      ? `${pricing.referencePrice.toLocaleString("tr-TR")} ${currency}`
      : null;

  if (compact) {
    return (
      <View style={styles.compactWrap}>
        <View style={styles.compactPriceRow}>
          {net ? (
            <Text unstyled disableThemeColor style={styles.compactNet}>
              {net}
            </Text>
          ) : null}
          {reference ? (
            <Text unstyled disableThemeColor style={[styles.compactReference, { color: mutedColor }]}>
              {reference}
            </Text>
          ) : null}
        </View>
        {discountRates.length > 0 ? (
          <View style={styles.compactBadgeRow}>
            {discountRates.map((rate) => (
              <View
                key={rate}
                style={[styles.compactBadge, { backgroundColor: accentColor + "18" }]}
              >
                <Text unstyled disableThemeColor style={[styles.compactBadgeText, { color: accentColor }]}>
                  %{rate}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.priceRow}>
        {reference ? <Text style={[styles.reference, { color: mutedColor }]}>{reference}</Text> : null}
        {net ? <Text style={[styles.net, { color: "#22C55E" }]}>{net}</Text> : null}
      </View>
      {discountRates.length > 0 ? (
        <View style={styles.badgeRow}>
          {discountRates.map((rate) => (
            <View
              key={rate}
              style={[styles.badge, { backgroundColor: accentColor + "22", borderColor: accentColor + "55" }]}
            >
              <Text style={[styles.badgeText, { color: accentColor }]}>%{rate}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4, marginTop: 4 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  reference: { textDecorationLine: "line-through", fontSize: 12, fontWeight: "600" },
  net: { fontSize: 14, fontWeight: "800" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  badge: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  compactWrap: { gap: 1, marginTop: 2 },
  compactPriceRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4 },
  compactReference: { fontSize: 9, fontWeight: "500", textDecorationLine: "line-through" },
  compactNet: { color: "#22C55E", fontSize: 10, fontWeight: "700" },
  compactBadgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 3, marginTop: 1 },
  compactBadge: { borderRadius: 999, paddingHorizontal: 4, paddingVertical: 1 },
  compactBadgeText: { fontSize: 8, fontWeight: "700" },
});
