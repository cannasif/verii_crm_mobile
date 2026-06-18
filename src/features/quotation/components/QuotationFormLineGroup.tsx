import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "@/components/ui/text";
import { useUIStore } from "@/store/ui";
import { useTranslation } from "react-i18next";
import { QuotationFormLineRow } from "./QuotationFormLineRow";
import type { QuotationLineFormState } from "../types";

export interface QuotationFormLineGroupProps {
  line: QuotationLineFormState;
  isReadonly?: boolean;
  currencyLabel?: string | null;
  hideVatRate?: boolean;
  onEdit: (line: QuotationLineFormState) => void;
  onDelete: (lineId: string) => void;
}

function QuotationFormLineGroupComponent({
  line,
  isReadonly,
  currencyLabel,
  hideVatRate,
  onEdit,
  onDelete,
}: QuotationFormLineGroupProps): React.ReactElement {
  const { colors, themeMode } = useUIStore();
  const { t } = useTranslation();
  const isDark = themeMode === "dark";
  const softText = colors.textMuted;
  const accentLine = isDark ? "rgba(236,72,153,0.40)" : "rgba(219,39,119,0.24)";

  return (
    <View style={styles.wrapper}>
      <QuotationFormLineRow
        line={line}
        isReadonly={isReadonly}
        currencyLabel={currencyLabel}
        hideVatRate={hideVatRate}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      {line.relatedLines && line.relatedLines.length > 0 ? (
        <View style={styles.relatedBlock}>
          <Text style={[styles.relatedTitle, { color: softText }]}>{t("quotation.relatedStocks")}</Text>
          <View style={[styles.relatedList, { borderLeftColor: accentLine }]}>
            {line.relatedLines.map((relatedLine) => (
              <QuotationFormLineRow
                key={relatedLine.id}
                line={relatedLine}
                related
                isReadonly={isReadonly}
                currencyLabel={currencyLabel}
                hideVatRate={hideVatRate}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export const QuotationFormLineGroup = memo(QuotationFormLineGroupComponent);

const styles = StyleSheet.create({
  wrapper: {
    gap: 0,
  },
  relatedBlock: {
    marginTop: 10,
    gap: 8,
  },
  relatedTitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.45,
    textTransform: "uppercase",
    opacity: 0.8,
    paddingLeft: 4,
  },
  relatedList: {
    gap: 8,
    paddingLeft: 10,
    marginLeft: 4,
    borderLeftWidth: 2,
  },
});
