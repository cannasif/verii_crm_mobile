import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "@/components/ui/text";
import { useUIStore } from "@/store/ui";
import { useTranslation } from "react-i18next";
import { SalesDocumentFormLineRow } from "./SalesDocumentFormLineRow";
import type { SalesDocumentLineFormState, SalesDocumentLineTranslationPrefix } from "./types";

export interface SalesDocumentFormLineGroupProps<T extends SalesDocumentLineFormState> {
  line: T;
  isReadonly?: boolean;
  currencyLabel?: string | null;
  hideVatRate?: boolean;
  translationPrefix: SalesDocumentLineTranslationPrefix;
  onEdit: (line: T) => void;
  onDelete: (lineId: string) => void;
}

function SalesDocumentFormLineGroupComponent<T extends SalesDocumentLineFormState>({
  line,
  isReadonly,
  currencyLabel,
  hideVatRate,
  translationPrefix,
  onEdit,
  onDelete,
}: SalesDocumentFormLineGroupProps<T>): React.ReactElement {
  const { colors, themeMode } = useUIStore();
  const { t } = useTranslation();
  const isDark = themeMode === "dark";
  const softText = colors.textMuted;
  const accentLine = isDark ? "rgba(236,72,153,0.40)" : "rgba(219,39,119,0.24)";

  return (
    <View style={styles.wrapper}>
      <SalesDocumentFormLineRow
        line={line}
        isReadonly={isReadonly}
        currencyLabel={currencyLabel}
        hideVatRate={hideVatRate}
        translationPrefix={translationPrefix}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      {line.relatedLines && line.relatedLines.length > 0 ? (
        <View style={styles.relatedBlock}>
          <Text style={[styles.relatedTitle, { color: softText }]}>
            {t(`${translationPrefix}.relatedStocks`)}
          </Text>
          <View style={[styles.relatedList, { borderLeftColor: accentLine }]}>
            {line.relatedLines.map((relatedLine) => (
              <SalesDocumentFormLineRow
                key={relatedLine.id}
                line={relatedLine as T}
                related
                isReadonly={isReadonly}
                currencyLabel={currencyLabel}
                hideVatRate={hideVatRate}
                translationPrefix={translationPrefix}
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

export const SalesDocumentFormLineGroup = memo(
  SalesDocumentFormLineGroupComponent
) as typeof SalesDocumentFormLineGroupComponent;

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
