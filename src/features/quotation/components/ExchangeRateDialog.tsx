import React, { useCallback, useState, useEffect, useMemo } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { parseDecimalInput, sanitizeDecimalInput } from "../../../lib/decimal-input";
import type { QuotationExchangeRateFormState, CurrencyOptionDto, ExchangeRateDto } from "../types";

interface ExchangeRateDialogProps {
  visible: boolean;
  exchangeRates: QuotationExchangeRateFormState[];
  currencyOptions?: CurrencyOptionDto[];
  erpExchangeRates?: ExchangeRateDto[];
  isLoadingErpRates?: boolean;
  currencyInUse?: string;
  onClose: () => void;
  onSave: (rates: QuotationExchangeRateFormState[]) => void;
  offerDate?: string;
  useQuotationRatesAsPrimary?: boolean;
}

export function ExchangeRateDialog({
  visible,
  exchangeRates: initialRates,
  currencyOptions,
  erpExchangeRates = [],
  isLoadingErpRates = false,
  onClose,
  onSave,
  offerDate,
  useQuotationRatesAsPrimary = false,
}: ExchangeRateDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const { colors, themeMode } = useUIStore();
  const insets = useSafeAreaInsets();

  // KARANLIK MOD RENKLERİ (Sadece renkler eklendi)
  const isDark = themeMode === "dark";
  const mainBg = isDark ? "#161224" : colors.card;
  const inputBg = isDark ? "rgba(255,255,255,0.03)" : colors.backgroundSecondary;
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : colors.border;
  const textColor = isDark ? "#F8FAFC" : colors.text;
  const textMuted = isDark ? "#94A3B8" : colors.textSecondary;

  const [rates, setRates] = useState<QuotationExchangeRateFormState[]>([]);

  const today = useMemo(
    () => offerDate || new Date().toISOString().split("T")[0],
    [offerDate]
  );

  useEffect(() => {
    if (!visible) return;
    if (useQuotationRatesAsPrimary) {
      setRates([...initialRates]);
      return;
    }
    if (erpExchangeRates.length === 0 && isLoadingErpRates) return;
    if (erpExchangeRates.length === 0) {
      setRates([]);
      return;
    }
    const merged = erpExchangeRates.map((erp) => {
      const match = initialRates.find(
        (r) => r.currency === String(erp.dovizTipi) || r.dovizTipi === erp.dovizTipi
      );
      return {
        id: `erp-${erp.dovizTipi}`,
        currency: String(erp.dovizTipi),
        dovizTipi: erp.dovizTipi,
        exchangeRate: match?.exchangeRate ?? erp.kurDegeri ?? 0,
        exchangeRateDate: match?.exchangeRateDate ?? erp.tarih ?? today,
        isOfficial: match?.isOfficial ?? true,
      };
    });
    setRates(merged);
  }, [visible, initialRates, erpExchangeRates, today, isLoadingErpRates, useQuotationRatesAsPrimary]);

  const handleRateChange = useCallback(
    (id: string, field: keyof QuotationExchangeRateFormState, value: string | number | boolean) => {
      setRates((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const next = { ...r, [field]: value };
          if (field === "exchangeRate") {
            next.isOfficial = false;
          }
          return next;
        })
      );
    },
    []
  );

  const handleApplyErpRate = useCallback(
    (id: string, erpRate: number) => {
      setRates((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, exchangeRate: erpRate, isOfficial: true } : r
        )
      );
    },
    []
  );

  const handleSave = useCallback(() => {
    onSave(rates);
    onClose();
  }, [rates, onSave, onClose]);

  const getCurrencyName = useCallback(
    (code: string) => {
      const fromOptions = currencyOptions?.find((c) => c.code === code)?.dovizIsmi;
      if (fromOptions) return fromOptions;
      const fromErp = erpExchangeRates.find((r) => String(r.dovizTipi) === code)?.dovizIsmi;
      return fromErp ?? code;
    },
    [currencyOptions, erpExchangeRates]
  );

  const getErpRate = useCallback(
    (currencyCode: string) => {
      if (!currencyCode || !erpExchangeRates.length) return undefined;
      return erpExchangeRates.find((r) => String(r.dovizTipi) === currencyCode)?.kurDegeri;
    },
    [erpExchangeRates]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} />
        <View
          style={[
            styles.modalContent,
            { backgroundColor: mainBg, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
            <View style={[styles.handle, { backgroundColor: borderColor }]} />
            <View style={styles.headerRow}>
              <View style={[styles.dollarIcon, { backgroundColor: "#10B981" }]}>
                <Text style={styles.dollarIconText}>$</Text>
              </View>
              <View style={styles.headerTitles}>
                <Text style={[styles.modalTitle, { color: textColor }]}>Döviz Kurları</Text>
                <Text style={[styles.modalSubtitle, { color: textMuted }]}>
                  Güncel kur değerlerini yönetin
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={[styles.closeButtonText, { color: textColor }]}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.contentWrapper}>
          {visible && isLoadingErpRates && rates.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[styles.loadingText, { color: textMuted }]}>
                Kurlar yükleniyor...
              </Text>
            </View>
          ) : (
          <FlatListScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
          >
                {rates.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: textMuted }]}>
                  {isLoadingErpRates
                    ? "Kurlar yükleniyor..."
                    : "Kur listesi boş. Teklif tarihi seçili mi kontrol edin veya daha sonra tekrar deneyin."}
                </Text>
              </View>
            ) : (
              <>
                <View style={[styles.tableHeader, { borderBottomColor: borderColor }]}>
                  <Text style={[styles.tableHeaderCell, styles.cellPara, { color: textMuted }]}>
                    PARA BIRIMI
                  </Text>
                  <Text style={[styles.tableHeaderCell, styles.cellKur, { color: textMuted }]}>
                    KUR
                  </Text>
                  <Text style={[styles.tableHeaderCell, styles.cellDurum, { color: textMuted }]}>
                    DURUM
                  </Text>
                  <View style={styles.cellIslem}>
                    <Text style={[styles.tableHeaderCellText, { color: textMuted }]}>
                      İŞLEMLER
                    </Text>
                  </View>
                </View>
                {rates.map((rate) => {
                  const erpRate = getErpRate(rate.currency);
                  const isCustom = !rate.isOfficial;

                  return (
                    <View
                      key={rate.id}
                      style={[styles.tableRow, { borderBottomColor: borderColor }]}
                    >
                      <View style={[styles.tableCell, styles.cellPara]}>
                        <Text style={[styles.cellText, { color: textColor }]} numberOfLines={1}>
                          {getCurrencyName(rate.currency)}
                        </Text>
                      </View>
                      <View style={[styles.tableCell, styles.cellKur]}>
                        <TextInput
                          style={[
                            styles.tableInput,
                            {
                              backgroundColor: inputBg,
                              borderColor: borderColor,
                              color: textColor,
                            },
                          ]}
                          value={
                            rate.exchangeRate != null && rate.exchangeRate !== 0
                              ? String(rate.exchangeRate)
                              : ""
                          }
                          onChangeText={(text) =>
                            handleRateChange(
                              rate.id,
                              "exchangeRate",
                              parseDecimalInput(sanitizeDecimalInput(text))
                            )
                          }
                          placeholder="0.000001"
                          placeholderTextColor={textMuted}
                          keyboardType="decimal-pad"
                        />
                      </View>
                      <View style={[styles.tableCell, styles.cellDurum]}>
                        <View
                          style={[
                            styles.statusPill,
                            { backgroundColor: isCustom ? colors.accent + "25" : "#10B98120" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusPillText,
                              { color: isCustom ? colors.accent : "#10B981" },
                            ]}
                          >
                            {isCustom ? "Özel" : "Resmi"}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.tableCell, styles.cellIslem]}>
                        {erpRate !== undefined ? (
                          <TouchableOpacity
                            style={[styles.editButton, { borderColor: borderColor }]}
                            onPress={() => handleApplyErpRate(rate.id, erpRate)}
                          >
                            <Text style={[styles.editButtonText, { color: textColor }]}>✎</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
                <View style={[styles.infoBox, { backgroundColor: isDark ? "rgba(59, 130, 246, 0.15)" : "#3B82F620" }]}>
                  <Text style={[styles.infoBoxIcon, { color: isDark ? "#60A5FA" : "#3B82F6" }]}>$</Text>
                  <Text style={[styles.infoBoxText, { color: textColor }]}>
                    Burada yapılan değişiklikler sadece bu teklif için geçerlidir ve genel sistem kurlarını etkilemez. Değiştirilen kurlar "Özel" olarak işaretlenir.
                  </Text>
                </View>
              </>
            )}
          </FlatListScrollView>
          )}
          </View>

          <View style={[styles.modalFooter, { borderTopColor: borderColor }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: borderColor }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: textColor }]}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.accent }]}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Kaydet ve Uygula</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  modalContent: {
    height: "90%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  contentWrapper: {
    flex: 1,
    minHeight: 120,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  handle: {
    position: "absolute",
    top: 8,
    left: "50%",
    transform: [{ translateX: -20 }],
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  dollarIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  dollarIconText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  headerTitles: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: "300",
  },
  loadingContainer: {
    flex: 1,
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    paddingVertical: 32,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    padding: 20,
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  tableHeaderCellText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  cellPara: {
    flex: 1.4,
    paddingRight: 8,
  },
  cellKur: {
    flex: 1,
    paddingRight: 8,
  },
  cellDurum: {
    flex: 0.9,
    paddingRight: 8,
  },
  cellIslem: {
    flex: 0.5,
    alignItems: "flex-end",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  tableCell: {
    justifyContent: "center",
  },
  cellText: {
    fontSize: 14,
    fontWeight: "500",
  },
  tableInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    minWidth: 0,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  editButtonDisabled: {
    opacity: 0.5,
  },
  editButtonText: {
    fontSize: 16,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
    gap: 10,
  },
  infoBoxIcon: {
    fontSize: 18,
    fontWeight: "700",
  },
  infoBoxText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
