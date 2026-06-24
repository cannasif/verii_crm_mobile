import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import {
  Cancel01Icon,
  Invoice03Icon,
  MoneyExchange01Icon,
  Wallet01Icon,
} from "hugeicons-react-native";
import { Text } from "@/components/ui/text";
import { formatSystemNumber } from "@/lib/systemSettings";
import { useUIStore } from "@/store/ui";
import { useCustomer360ErpBalance } from "@/features/customer360/hooks";

interface CustomerErpBalanceActionProps {
  customerId?: number | null;
  erpCustomerCode?: string | null;
  customerLabel?: string | null;
}

function formatAmount(value: number | null | undefined): string {
  return formatSystemNumber(Number(value ?? 0), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function CustomerErpBalanceAction({
  customerId,
  erpCustomerCode,
  customerLabel,
}: CustomerErpBalanceActionProps): React.ReactElement | null {
  const { t } = useTranslation();
  const { colors, themeMode } = useUIStore();
  const [visible, setVisible] = useState(false);
  const isDark = themeMode === "dark";
  const normalizedCustomerId = typeof customerId === "number" && customerId > 0 ? customerId : undefined;
  const normalizedErpCode = (erpCustomerCode ?? "").trim();
  const canOpen = Boolean(normalizedCustomerId && normalizedErpCode);
  const balanceQuery = useCustomer360ErpBalance(visible && canOpen ? normalizedCustomerId : undefined);

  const palette = useMemo(
    () => ({
      backdrop: "rgba(2,6,23,0.68)",
      card: isDark ? "#121827" : "#FFFFFF",
      cardBorder: isDark ? "rgba(148,163,184,0.24)" : "rgba(15,23,42,0.10)",
      tile: isDark ? "rgba(15,23,42,0.80)" : "rgba(248,250,252,0.96)",
      tileBorder: isDark ? "rgba(148,163,184,0.22)" : "rgba(15,23,42,0.08)",
      muted: isDark ? "#94A3B8" : "#64748B",
      title: colors.text,
      accent: colors.accent,
      danger: colors.error,
    }),
    [colors.accent, colors.error, colors.text, isDark]
  );

  if (!canOpen) return null;

  const balance = balanceQuery.data;
  const status = balance?.bakiyeDurumu?.trim() || t("customer360.erpBalanceDialog.closed");
  const displayCustomer = customerLabel || normalizedErpCode;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.86}
        accessibilityRole="button"
        accessibilityLabel={t("customer360.erpBalanceDialog.openButton")}
        style={[
          styles.actionButton,
          {
            backgroundColor: `${palette.accent}14`,
            borderColor: `${palette.accent}30`,
          },
        ]}
        onPress={() => setVisible(true)}
      >
        <Wallet01Icon size={21} color={palette.accent} variant="stroke" strokeWidth={1.8} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: palette.backdrop }]} onPress={() => setVisible(false)}>
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: palette.card,
                borderColor: palette.cardBorder,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <View
                  style={[
                    styles.headerIcon,
                    {
                      backgroundColor: `${palette.accent}14`,
                      borderColor: `${palette.accent}30`,
                    },
                  ]}
                >
                  <Wallet01Icon size={20} color={palette.accent} variant="stroke" strokeWidth={1.8} />
                </View>
                <View style={styles.headerText}>
                  <Text style={[styles.modalTitle, { color: palette.title }]}>
                    {t("customer360.erpBalanceDialog.title")}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: palette.muted }]} numberOfLines={1}>
                    {displayCustomer}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("common.close", { defaultValue: "Kapat" })}
                style={[styles.closeButton, { borderColor: palette.cardBorder }]}
                onPress={() => setVisible(false)}
              >
                <Cancel01Icon size={18} color={palette.muted} variant="stroke" strokeWidth={1.8} />
              </TouchableOpacity>
            </View>

            {balanceQuery.isLoading || balanceQuery.isFetching ? (
              <View style={styles.loadingArea}>
                <ActivityIndicator color={palette.accent} />
                <Text style={[styles.loadingText, { color: palette.muted }]}>
                  {t("customer360.erpBalanceDialog.loading")}
                </Text>
              </View>
            ) : balanceQuery.isError ? (
              <View style={[styles.errorBox, { borderColor: `${palette.danger}30`, backgroundColor: `${palette.danger}12` }]}>
                <Text style={[styles.errorText, { color: palette.danger }]}>
                  {t("customer360.erpBalanceDialog.error")}
                </Text>
              </View>
            ) : (
              <View style={styles.summaryGrid}>
                <SummaryTile
                  icon={<Invoice03Icon size={18} color={palette.accent} variant="stroke" strokeWidth={1.7} />}
                  label={t("customer360.erpBalanceDialog.totalDebit")}
                  value={formatAmount(balance?.toplamBorc)}
                  palette={palette}
                />
                <SummaryTile
                  icon={<MoneyExchange01Icon size={18} color={palette.accent} variant="stroke" strokeWidth={1.7} />}
                  label={t("customer360.erpBalanceDialog.totalCredit")}
                  value={formatAmount(balance?.toplamAlacak)}
                  palette={palette}
                />
                <SummaryTile
                  icon={<Wallet01Icon size={18} color={palette.accent} variant="stroke" strokeWidth={1.7} />}
                  label={`${t("customer360.erpBalanceDialog.balance")} · ${status}`}
                  value={formatAmount(balance?.bakiyeTutari ?? balance?.netBakiye)}
                  palette={palette}
                />
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function SummaryTile({
  icon,
  label,
  value,
  palette,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  palette: {
    tile: string;
    tileBorder: string;
    muted: string;
    title: string;
  };
}): React.ReactElement {
  return (
    <View style={[styles.summaryTile, { backgroundColor: palette.tile, borderColor: palette.tileBorder }]}>
      <View style={styles.summaryTileHeader}>
        {icon}
        <Text style={[styles.summaryLabel, { color: palette.muted }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[styles.summaryValue, { color: palette.title }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    width: 52,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    marginLeft: 10,
  },
  loadingArea: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  modalTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  summaryGrid: {
    gap: 10,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  summaryTile: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  summaryTileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "900",
  },
});
