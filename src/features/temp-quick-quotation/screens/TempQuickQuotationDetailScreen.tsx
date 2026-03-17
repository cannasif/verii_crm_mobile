import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import * as Sharing from "expo-sharing";
import { WebView } from "react-native-webview";
import {
  Calendar03Icon,
  Coins01Icon,
  File01Icon,
  Note01Icon,
  Tick02Icon,
  UserIcon,
  Edit02Icon,
} from "hugeicons-react-native";

import { ScreenHeader } from "../../../components/navigation";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useToast } from "../../../hooks/useToast";
import { tempQuickQuotationRepository } from "../repositories/tempQuotattion.repository";
import { createBuiltInTempQuickQuotationReportPdf } from "../utils/createBuiltInTempQuickQuotationReportPdf";
import type { QuotationLineFormState } from "../../quotation/types";
import { canPreviewPdfInApp, openPdfExternallyAsync } from "../../../lib/pdf";

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("tr-TR");
}

function formatNumber(value?: number | null, fractionDigits = 2): string {
  if (value == null || Number.isNaN(Number(value))) return "-";
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

function mapTempLineToFormState(
  id: number,
  line: {
    productCode: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    discountRate1: number;
    discountAmount1: number;
    discountRate2: number;
    discountAmount2: number;
    discountRate3: number;
    discountAmount3: number;
    vatRate: number;
    vatAmount: number;
    lineTotal: number;
    lineGrandTotal: number;
    description: string;
  }
): QuotationLineFormState {
  return {
    id: `db-${id}`,
    productId: null,
    productCode: line.productCode,
    productName: line.productName,
    groupCode: null,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    discountRate1: line.discountRate1,
    discountAmount1: line.discountAmount1,
    discountRate2: line.discountRate2,
    discountAmount2: line.discountAmount2,
    discountRate3: line.discountRate3,
    discountAmount3: line.discountAmount3,
    vatRate: line.vatRate,
    vatAmount: line.vatAmount,
    lineTotal: line.lineTotal,
    lineGrandTotal: line.lineGrandTotal,
    description: line.description,
    isEditing: false,
    relatedStockId: null,
    relatedProductKey: undefined,
    isMainRelatedProduct: true,
    approvalStatus: 0,
  };
}

export function TempQuickQuotationDetailScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToast();
  const { themeMode } = useUIStore();
  const params = useLocalSearchParams<{ id?: string }>();
  const quickQuotationId = params.id ? Number(params.id) : undefined;

  const isDark = themeMode === "dark";

  const colors = useMemo(
    () => ({
      mainBg: isDark ? "#09090F" : "#F8FAFC",
      cardBg: isDark ? "rgba(17,17,24,0.92)" : "rgba(255,255,255,0.97)",
      softBg: isDark ? "rgba(255,255,255,0.03)" : "#F8FAFC",
      inputBg: isDark ? "rgba(255,255,255,0.04)" : "rgba(248,250,252,0.94)",
      border: isDark ? "rgba(255,255,255,0.14)" : "rgba(148,163,184,0.26)",
      borderStrong: isDark ? "rgba(236,72,153,0.26)" : "rgba(219,39,119,0.22)",
      text: isDark ? "#F8FAFC" : "#0F172A",
      muted: isDark ? "#94A3B8" : "#64748B",
      brand: isDark ? "#EC4899" : "#DB2777",
      brandSoft: isDark ? "rgba(236,72,153,0.10)" : "rgba(219,39,119,0.07)",
      orange: "#F97316",
      orangeSoft: "rgba(249,115,22,0.10)",
      green: "#10B981",
      greenSoft: "rgba(16,185,129,0.10)",
      blue: "#38BDF8",
      blueSoft: "rgba(56,189,248,0.10)",
      shadow: isDark ? "#000000" : "#0F172A",
    }),
    [isDark]
  );

  const gradientColors = (
    isDark
      ? ["rgba(236,72,153,0.07)", "transparent", "rgba(249,115,22,0.04)"]
      : ["rgba(255,235,240,0.5)", "#FFFFFF", "rgba(255,244,237,0.5)"]
  ) as [string, string, ...string[]];

  const [pdfFileUri, setPdfFileUri] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const inAppPdfPreviewAvailable = useMemo(() => canPreviewPdfInApp(), []);
  const pdfViewerHeight = useMemo(() => Math.max(420, windowHeight * 0.55), [windowHeight]);

  const detailQuery = useQuery({
    queryKey: ["temp-quick-quotation", "detail", quickQuotationId],
    queryFn: () => tempQuickQuotationRepository.getById(quickQuotationId as number),
    enabled: quickQuotationId != null,
  });

  const linesQuery = useQuery({
    queryKey: ["temp-quick-quotation", "lines", quickQuotationId],
    queryFn: () => tempQuickQuotationRepository.getLinesByHeaderId(quickQuotationId as number),
    enabled: quickQuotationId != null,
  });

  const exchangeLinesQuery = useQuery({
    queryKey: ["temp-quick-quotation", "exchange-lines", quickQuotationId],
    queryFn: () => tempQuickQuotationRepository.getExchangeLinesByHeaderId(quickQuotationId as number),
    enabled: quickQuotationId != null,
  });

  const convertMutation = useMutation({
    mutationFn: (id: number) => tempQuickQuotationRepository.approveAndConvertToQuotation(id),
    onSuccess: () => {
      showSuccess("Teklife dönüştürme akışına alındı");
      queryClient.invalidateQueries({ queryKey: ["temp-quick-quotation", "list"] });
      queryClient.invalidateQueries({
        queryKey: ["temp-quick-quotation", "detail", quickQuotationId],
      });
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : "Teklife dönüştürme başarısız");
    },
  });

  const loading =
    detailQuery.isLoading || linesQuery.isLoading || exchangeLinesQuery.isLoading;

  const detail = detailQuery.data;

  const mappedLines = useMemo(
    () => (linesQuery.data ?? []).map((line) => mapTempLineToFormState(line.id, line)),
    [linesQuery.data]
  );

  const lineCount = linesQuery.data?.length ?? 0;

  const totalGrandAmount = useMemo(() => {
    return (linesQuery.data ?? []).reduce(
      (sum, line) => sum + Number(line.lineGrandTotal ?? 0),
      0
    );
  }, [linesQuery.data]);

  const handleGeneratePdf = useCallback(async () => {
    if (!detail || mappedLines.length === 0) {
      showError("PDF oluşturmak için hızlı teklif kalemleri bulunamadı");
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const fileUri = await createBuiltInTempQuickQuotationReportPdf({
        tempQuotationId: detail.id,
        customerName: detail.customerName,
        currencyCode: detail.currencyCode,
        lines: mappedLines,
        offerDate: detail.offerDate,
        description: detail.description,
      });

      setPdfFileUri(fileUri);
      if (!inAppPdfPreviewAvailable) {
        const result = await openPdfExternallyAsync(fileUri);
        if (!result.opened && result.reason === "no_app") {
          showError("Cihazda PDF açabilecek bir uygulama bulunamadı.");
        }
      }
      showSuccess("PDF oluşturuldu");
    } catch (error) {
      showError(error instanceof Error ? error.message : "PDF oluşturulamadı");
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [detail, mappedLines, showError, showSuccess, inAppPdfPreviewAvailable]);

  const handleSharePdf = useCallback(async () => {
    if (!pdfFileUri) return;

    try {
      const shareUri = pdfFileUri.startsWith("file://")
        ? pdfFileUri
        : `file://${pdfFileUri}`;

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        showError("Paylaşım bu cihazda kullanılamıyor");
        return;
      }

      await Sharing.shareAsync(shareUri, {
        mimeType: "application/pdf",
        dialogTitle: "Hızlı Teklif PDF Paylaş",
      });
    } catch (error) {
      showError(error instanceof Error ? error.message : "PDF paylaşılamadı");
    }
  }, [pdfFileUri, showError]);

  const handleOpenPdf = useCallback(async () => {
    if (!pdfFileUri) return;
    const result = await openPdfExternallyAsync(pdfFileUri);
    if (!result.opened) {
      showError(
        result.reason === "no_app"
          ? "Cihazda PDF açabilecek bir uygulama bulunamadı."
          : "PDF açılamadı."
      );
    }
  }, [pdfFileUri, showError]);

  return (
    <View style={[styles.container, { backgroundColor: colors.mainBg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
      </View>

      <ScreenHeader title="Hızlı Teklif Detayı" showBackButton />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : !detail ? (
        <View style={styles.center}>
          <View
            style={[
              styles.emptyStateCard,
              {
                backgroundColor: colors.cardBg,
                borderColor: colors.border,
                shadowColor: colors.shadow,
              },
            ]}
          >
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
              Kayıt bulunamadı
            </Text>
            <Text style={[styles.emptyStateText, { color: colors.muted }]}>
              İlgili hızlı teklif kaydı yüklenemedi veya silinmiş olabilir.
            </Text>
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: Math.max(insets.bottom, 24) + 88,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={
              isDark
                ? ["rgba(236,72,153,0.11)", "rgba(16,18,28,0.92)"]
                : ["rgba(255,243,248,0.9)", "rgba(255,255,255,0.98)"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.heroCard,
              {
                borderColor: colors.borderStrong,
                shadowColor: colors.shadow,
              },
            ]}
          >
            <View style={styles.heroTopRow}>
              <View style={styles.heroLeft}>
                <Text style={[styles.heroEyebrow, { color: colors.brand }]}>
                  Hızlı Teklif
                </Text>
                <Text style={[styles.heroTitle, { color: colors.text }]}>#{detail.id}</Text>
              </View>

              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: detail.isApproved
                      ? colors.greenSoft
                      : colors.orangeSoft,
                    borderColor: detail.isApproved
                      ? "rgba(16,185,129,0.22)"
                      : "rgba(249,115,22,0.22)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    { color: detail.isApproved ? colors.green : colors.orange },
                  ]}
                  numberOfLines={1}
                >
                  {detail.isApproved ? "Onaylandı" : "Taslak"}
                </Text>
              </View>
            </View>

            <View style={styles.customerRow}>
              <View
                style={[
                  styles.infoIconBox,
                  { backgroundColor: colors.brandSoft, borderColor: colors.borderStrong },
                ]}
              >
                <UserIcon size={15} color={colors.brand} variant="stroke" />
              </View>

              <View style={styles.customerContent}>
                <Text style={[styles.infoLabel, { color: colors.muted }]}>Cari</Text>
                <Text
                  style={[styles.customerValue, { color: colors.text }]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {detail.customerName || `Cari ID: ${detail.customerId}`}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View
                style={[
                  styles.metaChip,
                  { backgroundColor: colors.blueSoft, borderColor: "rgba(56,189,248,0.16)" },
                ]}
              >
                <Coins01Icon size={14} color={colors.blue} variant="stroke" />
                <Text
                  style={[styles.metaChipText, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {detail.currencyCode || "-"}
                </Text>
              </View>

              <View
                style={[
                  styles.metaChip,
                  {
                    backgroundColor: colors.orangeSoft,
                    borderColor: "rgba(249,115,22,0.16)",
                  },
                ]}
              >
                <Calendar03Icon size={14} color={colors.orange} variant="stroke" />
                <Text
                  style={[styles.metaChipText, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {formatDate(detail.offerDate)}
                </Text>
              </View>
            </View>

            <View style={styles.descriptionRow}>
              <View
                style={[
                  styles.infoIconBox,
                  { backgroundColor: colors.softBg, borderColor: colors.border },
                ]}
              >
                <Note01Icon size={14} color={colors.muted} variant="stroke" />
              </View>

              <View style={styles.customerContent}>
                <Text style={[styles.infoLabel, { color: colors.muted }]}>Açıklama</Text>
                <Text
                  style={[styles.infoValue, { color: colors.text }]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {detail.description || "-"}
                </Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.summaryRow}>
            <View
              style={[
                styles.summaryCard,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.border,
                  shadowColor: colors.shadow,
                },
              ]}
            >
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>
                Kalem Sayısı
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {lineCount}
              </Text>
            </View>

            <View
              style={[
                styles.summaryCard,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.border,
                  shadowColor: colors.shadow,
                },
              ]}
            >
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>Toplam</Text>
              <Text
                style={[styles.summaryValue, { color: colors.brand }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.9}
              >
                {formatNumber(totalGrandAmount)} {detail.currencyCode}
              </Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.actionBtnPrimary,
                {
                  backgroundColor: colors.blueSoft,
                  borderColor: "rgba(56,189,248,0.18)",
                },
              ]}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/sales/quotations/quick/create",
                  params: { id: String(detail.id) },
                })
              }
            >
              <Edit02Icon size={16} color={colors.blue} variant="stroke" />
              <Text style={[styles.actionBtnText, { color: colors.blue }]}>Revize Et</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.actionBtnPrimary,
                {
                  backgroundColor: detail.isApproved ? colors.softBg : colors.greenSoft,
                  borderColor: detail.isApproved
                    ? colors.border
                    : "rgba(16,185,129,0.18)",
                  opacity: convertMutation.isPending || detail.isApproved ? 0.65 : 1,
                },
              ]}
              disabled={convertMutation.isPending || detail.isApproved}
              onPress={() => convertMutation.mutate(detail.id)}
            >
              {convertMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.green} />
              ) : (
                <>
                  <Tick02Icon size={16} color={colors.green} variant="stroke" />
                  <Text style={[styles.actionBtnText, { color: colors.green }]}>
                    {detail.isApproved ? "Dönüştürüldü" : "Teklife Dön"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Stok Kalemleri</Text>
            <Text style={[styles.sectionBadge, { color: colors.muted }]}>
              {lineCount} kayıt
            </Text>
          </View>

          {(linesQuery.data ?? []).length === 0 ? (
            <View
              style={[
                styles.emptyListCard,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.emptyListText, { color: colors.muted }]}>
                Bu hızlı teklife ait stok kalemi bulunamadı.
              </Text>
            </View>
          ) : (
            (linesQuery.data ?? []).map((line, index) => (
              <View
                key={line.id}
                style={[
                  styles.lineCard,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: colors.border,
                    shadowColor: colors.shadow,
                  },
                ]}
              >
                <View style={styles.lineCardTop}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text
                      style={[styles.lineCode, { color: colors.brand }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {line.productCode}
                    </Text>
                    <Text
                      style={[styles.lineName, { color: colors.text }]}
                      numberOfLines={3}
                      ellipsizeMode="tail"
                    >
                      {line.productName || "-"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.lineIndexBadge,
                      {
                        backgroundColor: colors.brandSoft,
                        borderColor: colors.borderStrong,
                      },
                    ]}
                  >
                    <Text style={[styles.lineIndexText, { color: colors.brand }]}>
                      {index + 1}
                    </Text>
                  </View>
                </View>

                <View style={styles.metricGrid}>
                  <View
                    style={[
                      styles.metricBox,
                      { backgroundColor: colors.softBg, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.metricLabel, { color: colors.muted }]}>Miktar</Text>
                    <Text style={[styles.metricValue, { color: colors.text }]} numberOfLines={1}>
                      {formatNumber(line.quantity, 2)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.metricBox,
                      { backgroundColor: colors.softBg, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.metricLabel, { color: colors.muted }]}>Birim Fiyat</Text>
                    <Text
                      style={[styles.metricValue, { color: colors.text }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.9}
                    >
                      {formatNumber(line.unitPrice)} {detail.currencyCode}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.metricBox,
                      { backgroundColor: colors.softBg, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.metricLabel, { color: colors.muted }]}>İskonto</Text>
                    <Text style={[styles.metricValue, { color: colors.text }]} numberOfLines={1}>
                      %{formatNumber(line.discountRate1 ?? 0, 2)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.metricBox,
                      { backgroundColor: colors.softBg, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.metricLabel, { color: colors.muted }]}>KDV</Text>
                    <Text style={[styles.metricValue, { color: colors.text }]} numberOfLines={1}>
                      %{formatNumber(line.vatRate ?? 0, 2)}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.totalRow,
                    {
                      backgroundColor: colors.brandSoft,
                      borderColor: colors.borderStrong,
                    },
                  ]}
                >
                  <Text style={[styles.totalLabel, { color: colors.muted }]}>Satır Toplamı</Text>
                  <Text
                    style={[styles.totalValue, { color: colors.brand }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.9}
                  >
                    {formatNumber(line.lineGrandTotal)} {detail.currencyCode}
                  </Text>
                </View>

                {!!line.description && (
                  <View
                    style={[
                      styles.descriptionBox,
                      {
                        backgroundColor: colors.softBg,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.descriptionLabel, { color: colors.muted }]}>
                      Açıklama
                    </Text>
                    <Text
                      style={[styles.descriptionText, { color: colors.text }]}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {line.description}
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}

          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Kur Satırları</Text>
            <Text style={[styles.sectionBadge, { color: colors.muted }]}>
              {(exchangeLinesQuery.data ?? []).length} kayıt
            </Text>
          </View>

          {(exchangeLinesQuery.data ?? []).length === 0 ? (
            <View
              style={[
                styles.emptyListCard,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.emptyListText, { color: colors.muted }]}>
                Kur satırı bulunamadı.
              </Text>
            </View>
          ) : (
            (exchangeLinesQuery.data ?? []).map((rate) => (
              <View
                key={rate.id}
                style={[
                  styles.exchangeCard,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.cardBg,
                    shadowColor: colors.shadow,
                  },
                ]}
              >
                <View style={styles.exchangeLeft}>
                  <View
                    style={[
                      styles.exchangeIconBox,
                      {
                        backgroundColor: colors.orangeSoft,
                        borderColor: "rgba(249,115,22,0.16)",
                      },
                    ]}
                  >
                    <Coins01Icon size={14} color={colors.orange} variant="stroke" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.exchangeCurrency, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {rate.currency}
                    </Text>
                      <Text style={[styles.exchangeSub, { color: colors.muted }]}>
                      Kur değeri
                      </Text>
                  </View>
                </View>

                <Text
                  style={[styles.exchangeValue, { color: colors.brand }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.9}
                >
                  {formatNumber(rate.exchangeRate, 4)}
                </Text>
              </View>
            ))
          )}

          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <File01Icon size={16} color={colors.brand} variant="stroke" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>PDF Çıktısı</Text>
            </View>
          </View>

          <View
            style={[
              styles.pdfCard,
              {
                backgroundColor: colors.cardBg,
                borderColor: colors.borderStrong,
                shadowColor: colors.shadow,
              },
            ]}
          >
            <View style={styles.pdfHeader}>
              <Text style={[styles.pdfHeaderTitle, { color: colors.text }]}>
                Teklif Raporu
              </Text>
              <Text
                style={[styles.pdfHeaderSub, { color: colors.muted }]}
                numberOfLines={2}
              >
                Hazır şablon ile PDF oluştur ve paylaş
              </Text>
            </View>

            <View
              style={[
                styles.reportTemplateBox,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.inputBg,
                },
              ]}
            >
              <Text style={[styles.label, { color: colors.muted }]}>Rapor Şablonu</Text>
              <Text style={[styles.reportTemplateText, { color: colors.text }]} numberOfLines={1}>
                Windo Teklif Yap
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.reportPrimaryButton,
                {
                  backgroundColor: isGeneratingPdf ? colors.muted : colors.brand,
                  shadowColor: colors.brand,
                  borderColor: isGeneratingPdf ? colors.border : colors.borderStrong,
                },
              ]}
              onPress={() => void handleGeneratePdf()}
              disabled={isGeneratingPdf}
            >
              {isGeneratingPdf ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.reportPrimaryButtonText}>PDF Oluştur</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.reportSecondaryButton,
                {
                  backgroundColor: pdfFileUri ? colors.blue : colors.muted,
                  opacity: pdfFileUri ? 1 : 0.6,
                  shadowColor: colors.blue,
                  borderColor: pdfFileUri ? "rgba(56,189,248,0.28)" : colors.border,
                },
              ]}
              onPress={() => void handleSharePdf()}
              disabled={!pdfFileUri}
            >
              <Text style={styles.reportSecondaryButtonText}>Paylaş</Text>
            </TouchableOpacity>

            {pdfFileUri ? (
              <View
                style={[
                  styles.previewSection,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.inputBg,
                  },
                ]}
              >
                <Text style={[styles.previewTitle, { color: colors.text }]}>
                  PDF Önizleme
                </Text>

                <View
                  style={[
                    styles.pdfViewerWrapper,
                    {
                      height: pdfViewerHeight,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <WebView
                    source={{ uri: pdfFileUri }}
                    originWhitelist={["file://", "content://"]}
                    style={styles.pdfWebView}
                    scalesPageToFit
                    nestedScrollEnabled
                  />
                </View>
              </View>
            ) : (
              <View
                style={[
                  styles.previewPlaceholder,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.softBg,
                  },
                ]}
              >
                <Text style={[styles.previewPlaceholderTitle, { color: colors.text }]}>
                  PDF henüz oluşturulmadı
                </Text>
                <Text style={[styles.previewPlaceholderText, { color: colors.muted }]}>
                  Önizleme alanı için önce PDF oluştur.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  content: {
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 10,
  },

  heroCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 13,
    gap: 10,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },

  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },

  heroLeft: {
    flex: 1,
    gap: 2,
    paddingRight: 8,
  },

  heroEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.25,
    lineHeight: 24,
  },

  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    alignSelf: "flex-start",
    minHeight: 28,
    justifyContent: "center",
  },

  statusPillText: {
    fontSize: 10,
    fontWeight: "700",
  },

  customerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },

  descriptionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },

  customerContent: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },

  metaRow: {
    flexDirection: "row",
    gap: 8,
  },

  metaChip: {
    flex: 1,
    minHeight: 36,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  metaChipText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: "500",
    lineHeight: 14,
  },

  infoIconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },

  infoLabel: {
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 12,
  },

  infoValue: {
    fontSize: 11.5,
    fontWeight: "500",
    lineHeight: 15,
    flexShrink: 1,
  },

  customerValue: {
    fontSize: 12.5,
    fontWeight: "600",
    lineHeight: 16,
    flexShrink: 1,
    paddingRight: 6,
  },

  summaryRow: {
    flexDirection: "row",
    gap: 8,
  },

  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowOpacity: 0.025,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },

  summaryLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 4,
    lineHeight: 12,
  },

  summaryValue: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },

  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },

  actionBtnPrimary: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 8,
  },

  actionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 15,
  },

  sectionHeaderRow: {
    marginTop: 4,
    marginBottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },

  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  sectionTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    letterSpacing: -0.1,
    lineHeight: 16,
  },

  sectionBadge: {
    fontSize: 10.5,
    fontWeight: "600",
    lineHeight: 12,
  },

  lineCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 11,
    gap: 9,
    shadowOpacity: 0.025,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },

  lineCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },

  lineCode: {
    fontSize: 10.5,
    fontWeight: "800",
    marginBottom: 2,
    lineHeight: 13,
  },

  lineName: {
    fontSize: 12.5,
    fontWeight: "800",
    lineHeight: 16,
    flexShrink: 1,
  },

  lineIndexBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },

  lineIndexText: {
    fontSize: 10.5,
    fontWeight: "800",
    lineHeight: 12,
  },

  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },

  metricBox: {
    width: "48.4%",
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 9,
    paddingVertical: 8,
    gap: 4,
  },

  metricLabel: {
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 12,
  },

  metricValue: {
    fontSize: 11.5,
    fontWeight: "500",
    lineHeight: 14,
  },

  totalRow: {
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },

  totalLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    lineHeight: 12,
    flex: 1,
  },

  totalValue: {
    fontSize: 11.8,
    fontWeight: "600",
    lineHeight: 14,
    flexShrink: 1,
    textAlign: "right",
  },

  descriptionBox: {
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 9,
    paddingVertical: 8,
    gap: 4,
  },

  descriptionLabel: {
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 12,
  },

  descriptionText: {
    fontSize: 10.8,
    lineHeight: 14,
    fontWeight: "500",
  },

  exchangeCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowOpacity: 0.02,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },

  exchangeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },

  exchangeIconBox: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  exchangeCurrency: {
    fontSize: 11.5,
    fontWeight: "700",
    lineHeight: 14,
  },

  exchangeSub: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 1,
    lineHeight: 12,
  },

  exchangeValue: {
    fontSize: 11.5,
    fontWeight: "500",
    lineHeight: 14,
    flexShrink: 1,
    textAlign: "right",
  },

  pdfCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 10,
    shadowOpacity: 0.03,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },

  pdfHeader: {
    gap: 2,
  },

  pdfHeaderTitle: {
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 16,
  },

  pdfHeaderSub: {
    fontSize: 10.5,
    fontWeight: "500",
    lineHeight: 13,
  },

  label: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 5,
    lineHeight: 12,
  },

  reportTemplateBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },

  reportTemplateText: {
    fontSize: 11.5,
    fontWeight: "500",
    lineHeight: 14,
  },

  reportPrimaryButton: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },

  reportPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 14,
  },

  reportSecondaryButton: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },

  reportSecondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 14,
  },

  previewSection: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 9,
    gap: 7,
  },

  previewTitle: {
    fontSize: 11.5,
    fontWeight: "700",
    lineHeight: 14,
  },

  pdfViewerWrapper: {
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
  },

  pdfWebView: {
    flex: 1,
    backgroundColor: "transparent",
  },

  previewPlaceholder: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },

  previewPlaceholderTitle: {
    fontSize: 11.5,
    fontWeight: "700",
    lineHeight: 14,
  },

  previewPlaceholderText: {
    fontSize: 10.5,
    textAlign: "center",
    lineHeight: 13,
    fontWeight: "500",
  },

  emptyListCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyListText: {
    fontSize: 10.8,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 14,
  },

  emptyStateCard: {
    width: "100%",
    maxWidth: 380,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 6,
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },

  emptyStateTitle: {
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 17,
  },

  emptyStateText: {
    fontSize: 10.8,
    textAlign: "center",
    lineHeight: 14,
    fontWeight: "500",
  },
});