import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Buffer } from "buffer";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { WebView } from "react-native-webview";
import {
  Pdf01Icon,
  ArrowDown01Icon,
  Share05Icon,
  ViewIcon,
  Alert02Icon,
  FileEditIcon,
  SparklesIcon,
} from "hugeicons-react-native";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useToastStore } from "../../../store/toast";
import { useReportTemplateList, useGenerateReportPdf } from "../hooks";
import { PickerModal } from "./PickerModal";
import type { DocumentRuleTypeValue } from "../types";
import { canPreviewPdfInApp, openPdfExternallyAsync } from "../../../lib/pdf";
import { listContentBottomPadding } from "../../../constants/layout";

function arrayBufferToBase64(ab: ArrayBuffer): string {
  return Buffer.from(new Uint8Array(ab)).toString("base64");
}

interface ReportTabProps {
  entityId: number;
  ruleType: DocumentRuleTypeValue;
  builtInTemplates?: {
    id: string;
    title: string;
    isDefault?: boolean;
    generate: () => Promise<string>;
  }[];
}

const REPORT_PDF_PRIMARY_GRADIENT = {
  dark: ["#ea580c", "#e11d48", "#db2777"] as const,
  light: ["#fb923c", "#fb7185", "#ec4899"] as const,
};

export function ReportTab({
  entityId,
  ruleType,
  builtInTemplates = [],
}: ReportTabProps): React.ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, themeMode } = useUIStore();
  const showToast = useToastStore((s) => s.showToast);
  const { height: windowHeight } = useWindowDimensions();

  const { data: templates, isLoading: templatesLoading, isError: templatesError, error: templatesErrorObj, refetch } =
    useReportTemplateList(ruleType);

  const generatePdf = useGenerateReportPdf();

  const [selectedTemplateId, setSelectedTemplateId] = useState<number | string | undefined>(undefined);
  const [templatePickerVisible, setTemplatePickerVisible] = useState(false);
  const [pdfFileUri, setPdfFileUri] = useState<string | null>(null);
  const [isGeneratingBuiltIn, setIsGeneratingBuiltIn] = useState(false);

  const isGenerating = generatePdf.isPending || isGeneratingBuiltIn;

  const isDark = themeMode === "dark";
  const inAppPdfPreviewAvailable = useMemo(() => canPreviewPdfInApp(), []);

  const palette = useMemo(
    () => ({
      softBg: isDark ? "rgba(255,255,255,0.03)" : "#F8FAFC",
      inputBg: isDark ? "rgba(255,255,255,0.04)" : "rgba(248,250,252,0.94)",
      border: isDark ? "rgba(255,255,255,0.14)" : "rgba(148,163,184,0.26)",
      borderStrong: isDark ? "rgba(236,72,153,0.26)" : "rgba(219,39,119,0.22)",
      brand: isDark ? "#EC4899" : "#DB2777",
      brandSoft: isDark ? "rgba(236,72,153,0.10)" : "rgba(219,39,119,0.07)",
      orange: "#F97316",
      orangeSoft: "rgba(249,115,22,0.10)",
      blue: "#38BDF8",
      blueSoft: "rgba(56,189,248,0.10)",
      text: colors.text,
      muted: colors.textMuted,
      shadow: isDark ? "#000000" : "#0F172A",
      card: colors.card,
      cardBorder: colors.cardBorder,
      background: colors.background,
      backgroundSecondary: colors.backgroundSecondary,
    }),
    [colors, isDark]
  );

  const defaultTemplate = useMemo(() => {
    const builtInDefault = builtInTemplates.find((tpl) => tpl.isDefault === true);
    if (builtInDefault) return builtInDefault;
    return templates.find((tpl) => tpl.default === true) ?? templates[0];
  }, [builtInTemplates, templates]);

  useEffect(() => {
    if (defaultTemplate != null && selectedTemplateId == null) {
      setSelectedTemplateId(defaultTemplate.id);
    }
  }, [defaultTemplate, selectedTemplateId]);

  const selectedTemplate = useMemo(
    () =>
      builtInTemplates.find((tpl) => tpl.id === selectedTemplateId) ??
      templates.find((tpl) => tpl.id === selectedTemplateId),
    [builtInTemplates, templates, selectedTemplateId]
  );

  const handleGeneratePdf = useCallback(() => {
    if (selectedTemplateId == null) {
      showToast("error", t("report.selectTemplateFirst"));
      return;
    }

    const builtInTemplate = builtInTemplates.find((tpl) => tpl.id === selectedTemplateId);

    if (builtInTemplate) {
      generatePdf.reset();
      setIsGeneratingBuiltIn(true);

      void builtInTemplate
        .generate()
        .then((fileUri) => {
          setPdfFileUri(fileUri);

          if (!inAppPdfPreviewAvailable) {
            void openPdfExternallyAsync(fileUri).then((result) => {
              if (!result.opened && result.reason === "no_app") {
                showToast("error", t("report.viewerNotAvailable"));
              }
            });
          }

          showToast("success", t("report.generated"));
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : t("report.generateError");
          showToast("error", message);
        })
        .finally(() => {
          setIsGeneratingBuiltIn(false);
        });

      return;
    }

    generatePdf.mutate(
      { templateId: selectedTemplateId as number, entityId },
      {
        onSuccess: async (arrayBuffer: ArrayBuffer) => {
          try {
            const base64 = arrayBufferToBase64(arrayBuffer);
            const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;

            if (dir == null) {
              showToast("error", t("report.saveError"));
              generatePdf.reset();
              return;
            }

            const fileName = `report-${ruleType}-${entityId}-${Date.now()}.pdf`;
            const fileUri = `${dir}${fileName}`;

            await FileSystem.writeAsStringAsync(fileUri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });

            const displayUri = fileUri.startsWith("file://") ? fileUri : `file://${fileUri}`;
            setPdfFileUri(displayUri);

            if (!inAppPdfPreviewAvailable) {
              void openPdfExternallyAsync(displayUri).then((result) => {
                if (!result.opened && result.reason === "no_app") {
                  showToast("error", t("report.viewerNotAvailable"));
                }
              });
            }

            showToast("success", t("report.generated"));
          } catch (err) {
            const message = err instanceof Error ? err.message : t("report.saveError");
            showToast("error", message);
          }

          generatePdf.reset();
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : t("report.generateError");
          showToast("error", message);
        },
      }
    );
  }, [
    selectedTemplateId,
    entityId,
    ruleType,
    generatePdf,
    showToast,
    t,
    builtInTemplates,
    inAppPdfPreviewAvailable,
  ]);

  const handleOpenPdf = useCallback(async () => {
    if (pdfFileUri == null) return;

    const result = await openPdfExternallyAsync(pdfFileUri);

    if (!result.opened) {
      showToast(
        "error",
        t(result.reason === "no_app" ? "report.viewerNotAvailable" : "report.openError")
      );
    }
  }, [pdfFileUri, showToast, t]);

  const handleSharePdf = useCallback(async () => {
    if (pdfFileUri == null) return;

    try {
      const shareUri = pdfFileUri.startsWith("file://") ? pdfFileUri : `file://${pdfFileUri}`;
      const isAvailable = await Sharing.isAvailableAsync();

      if (isAvailable) {
        await Sharing.shareAsync(shareUri, {
          mimeType: "application/pdf",
          dialogTitle: t("report.shareTitle"),
        });
      } else {
        showToast("error", t("report.shareNotAvailable"));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t("report.saveError");
      showToast("error", message);
    }
  }, [pdfFileUri, showToast, t]);

  const pdfViewerHeight = useMemo(() => Math.max(400, windowHeight * 0.5), [windowHeight]);

  const pickerOptions = useMemo(
    () => [
      ...builtInTemplates.map((tpl) => ({
        id: tpl.id,
        name: tpl.title,
      })),
      ...templates.map((tpl) => ({
        id: tpl.id,
        name: tpl.title,
      })),
    ],
    [builtInTemplates, templates]
  );

  if (templatesLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={palette.brand} />
      </View>
    );
  }

  if (templatesError) {
    return (
      <View
        style={[
          styles.stateCard,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
          },
        ]}
      >
        <View
          style={[
            styles.stateIconWrap,
            {
              backgroundColor: isDark ? "rgba(244,114,182,0.14)" : "rgba(219,39,119,0.10)",
              borderColor: isDark ? "rgba(244,114,182,0.36)" : "rgba(219,39,119,0.26)",
            },
          ]}
        >
          <Alert02Icon size={22} color={colors.error} variant="stroke" strokeWidth={2.2} />
        </View>
        <Text style={[styles.stateTitle, { color: colors.error }]}>
          {t("common.error")}
        </Text>
        <Text style={[styles.stateText, { color: palette.muted }]}>
          {templatesErrorObj?.message ?? t("common.error")}
        </Text>

        <TouchableOpacity
          style={[
            styles.retryBtn,
            {
              backgroundColor: palette.brandSoft,
              borderColor: palette.borderStrong,
            },
          ]}
          onPress={() => refetch()}
        >
          <Text style={[styles.retryBtnText, { color: palette.brand }]}>
            {t("common.retry")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (templates.length === 0 && builtInTemplates.length === 0) {
    return (
      <View
        style={[
          styles.stateCard,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
          },
        ]}
      >
        <View
          style={[
            styles.stateIconWrap,
            {
              backgroundColor: isDark ? "rgba(148,163,184,0.16)" : "rgba(148,163,184,0.14)",
              borderColor: isDark ? "rgba(148,163,184,0.32)" : "rgba(148,163,184,0.30)",
            },
          ]}
        >
          <FileEditIcon size={22} color={isDark ? "#94A3B8" : "#475569"} variant="stroke" strokeWidth={2} />
        </View>
        <Text style={[styles.stateTitle, { color: palette.text }]}>
          {t("report.noTemplates")}
        </Text>
        <Text style={[styles.stateText, { color: palette.muted }]}>
          Rapor oluşturabilmek için kullanılabilir şablon bulunamadı.
        </Text>
      </View>
    );
  }

  return (
    <>
      <FlatListScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: listContentBottomPadding(insets.bottom) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.reportTemplateBox,
            {
              borderColor: palette.border,
              backgroundColor: palette.inputBg,
            },
          ]}
        >
          <View style={styles.labelRow}>
            <FileEditIcon size={11} color={palette.muted} variant="stroke" strokeWidth={2.2} />
            <Text style={[styles.label, { color: palette.muted }]}>
              {t("report.template")}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.templateSelector,
              {
                borderColor: palette.border,
                backgroundColor: palette.softBg,
              },
            ]}
            onPress={() => setTemplatePickerVisible(true)}
          >
            <Text style={[styles.templateSelectorText, { color: palette.text }]} numberOfLines={1}>
              {selectedTemplate?.title ?? t("report.selectTemplate")}
            </Text>
            <ArrowDown01Icon size={16} color={palette.muted} variant="stroke" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          style={[
            styles.reportPrimaryButton,
            {
              opacity: selectedTemplateId == null || isGenerating ? 0.85 : 1,
              shadowColor: palette.brand,
            },
          ]}
          onPress={handleGeneratePdf}
          disabled={isGenerating || selectedTemplateId == null}
        >
          <LinearGradient
            colors={isDark ? REPORT_PDF_PRIMARY_GRADIENT.dark : REPORT_PDF_PRIMARY_GRADIENT.light}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.reportPrimaryButtonInner}
          >
            {isGenerating ? (
              <>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={[styles.reportPrimaryButtonText, { color: "#FFFFFF" }]}>
                  {t("report.generatingPdf")}
                </Text>
              </>
            ) : (
              <>
                <SparklesIcon size={16} color="#FFFFFF" variant="stroke" strokeWidth={2.2} />
                <Text style={[styles.reportPrimaryButtonText, { color: "#FFFFFF" }]}>
                  {t("report.generatePdf")}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.pdfActionRow}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={[
              styles.reportSecondaryButton,
              {
                flex: 1,
                backgroundColor: pdfFileUri
                  ? isDark
                    ? "rgba(56,189,248,0.12)"
                    : "rgba(14,165,233,0.10)"
                  : isDark
                    ? "rgba(255,255,255,0.025)"
                    : "rgba(15,23,42,0.035)",
                borderColor: pdfFileUri
                  ? isDark
                    ? "rgba(56,189,248,0.32)"
                    : "rgba(14,165,233,0.22)"
                  : palette.border,
                opacity: pdfFileUri ? 1 : 0.55,
              },
            ]}
            onPress={handleOpenPdf}
            disabled={!pdfFileUri}
          >
            <ViewIcon
              size={14}
              color={pdfFileUri ? (isDark ? "#7DD3FC" : "#0284C7") : palette.muted}
              variant="stroke"
              strokeWidth={2.2}
            />
            <Text
              style={[
                styles.reportSecondaryButtonText,
                { color: pdfFileUri ? (isDark ? "#7DD3FC" : "#0284C7") : palette.muted },
              ]}
            >
              {t("report.openPdf")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.88}
            style={[
              styles.reportSecondaryButton,
              {
                flex: 1,
                backgroundColor: pdfFileUri
                  ? isDark
                    ? "rgba(249,115,22,0.12)"
                    : "rgba(245,158,11,0.10)"
                  : isDark
                    ? "rgba(255,255,255,0.025)"
                    : "rgba(15,23,42,0.035)",
                borderColor: pdfFileUri
                  ? isDark
                    ? "rgba(249,115,22,0.30)"
                    : "rgba(245,158,11,0.24)"
                  : palette.border,
                opacity: pdfFileUri ? 1 : 0.55,
              },
            ]}
            onPress={handleSharePdf}
            disabled={!pdfFileUri}
          >
            <Share05Icon
              size={14}
              color={pdfFileUri ? (isDark ? "#FDBA74" : "#D97706") : palette.muted}
              variant="stroke"
              strokeWidth={2.2}
            />
            <Text
              style={[
                styles.reportSecondaryButtonText,
                { color: pdfFileUri ? (isDark ? "#FDBA74" : "#D97706") : palette.muted },
              ]}
            >
              {t("report.share")}
            </Text>
          </TouchableOpacity>
        </View>

        {isGenerating ? (
          <View
            style={[
              styles.generatingCard,
              {
                borderColor: isDark ? "rgba(251,146,60,0.28)" : "rgba(251,113,133,0.24)",
                backgroundColor: isDark ? "rgba(234,88,12,0.10)" : "rgba(251,113,133,0.08)",
              },
            ]}
          >
            <ActivityIndicator color={isDark ? "#fb7185" : "#e11d48"} size="small" />
            <Text style={[styles.generatingText, { color: isDark ? "#fda4af" : "#db2777" }]}>
              {t("report.generatingPdf")}
            </Text>
          </View>
        ) : pdfFileUri == null ? (
          <View
            style={[
              styles.previewInfoCard,
              {
                borderColor: palette.border,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.025)"
                  : "rgba(15,23,42,0.03)",
              },
            ]}
          >
            <View style={styles.previewHeaderRow}>
              <View
                style={[
                  styles.previewIconWrap,
                  {
                    backgroundColor: isDark ? "rgba(148,163,184,0.16)" : "rgba(148,163,184,0.14)",
                    borderColor: isDark ? "rgba(148,163,184,0.30)" : "rgba(148,163,184,0.26)",
                  },
                ]}
              >
                <Pdf01Icon size={16} color={palette.muted} variant="stroke" strokeWidth={2.2} />
              </View>
              <Text style={[styles.previewTitle, { color: palette.text }]}>
                PDF henüz oluşturulmadı
              </Text>
            </View>
            <Text style={[styles.previewInfoText, { color: palette.muted }]}>
              Önce PDF oluşturun, ardından açabilir veya paylaşabilirsiniz.
            </Text>
          </View>
        ) : inAppPdfPreviewAvailable ? (
          <View
            style={[
              styles.previewSection,
              {
                backgroundColor: palette.card,
                borderColor: palette.borderStrong,
              },
            ]}
          >
            <View style={styles.previewHeaderRow}>
              <View
                style={[
                  styles.previewIconWrap,
                  {
                    backgroundColor: palette.brandSoft,
                    borderColor: isDark ? "rgba(236,72,153,0.34)" : "rgba(219,39,119,0.26)",
                  },
                ]}
              >
                <Pdf01Icon size={16} color={palette.brand} variant="stroke" strokeWidth={2.2} />
              </View>
              <Text style={[styles.previewTitle, { color: palette.text }]}>
                {t("report.preview")}
              </Text>
            </View>

            <View
              style={[
                styles.pdfViewerWrapper,
                {
                  height: pdfViewerHeight,
                  backgroundColor: palette.backgroundSecondary,
                  borderColor: palette.border,
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
              styles.previewInfoCard,
              {
                borderColor: isDark
                  ? "rgba(236,72,153,0.22)"
                  : "rgba(219,39,119,0.18)",
                backgroundColor: isDark
                  ? "rgba(236,72,153,0.10)"
                  : "rgba(219,39,119,0.07)",
              },
            ]}
          >
            <View style={styles.previewHeaderRow}>
              <View
                style={[
                  styles.previewIconWrap,
                  {
                    backgroundColor: palette.brandSoft,
                    borderColor: isDark ? "rgba(236,72,153,0.34)" : "rgba(219,39,119,0.26)",
                  },
                ]}
              >
                <Pdf01Icon size={16} color={palette.brand} variant="stroke" strokeWidth={2.2} />
              </View>
              <Text style={[styles.previewTitle, { color: palette.text }]}>
                PDF hazır
              </Text>
            </View>
            <Text style={[styles.previewInfoText, { color: palette.muted }]}>
              {t("report.androidPreviewFallback")}
            </Text>
          </View>
        )}
      </FlatListScrollView>

      <PickerModal
        visible={templatePickerVisible}
        options={pickerOptions}
        selectedValue={selectedTemplateId}
        onSelect={(o) => {
          setSelectedTemplateId(o.id);
          setTemplatePickerVisible(false);
        }}
        onClose={() => setTemplatePickerVisible(false)}
        title={t("report.selectTemplate")}
        searchPlaceholder={t("report.searchTemplate")}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "transparent",
  },

  scrollContent: {
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 4,
  },

  centered: {
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  stateCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  stateIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },

  stateTitle: {
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 16,
    textAlign: "center",
  },

  stateText: {
    fontSize: 10.8,
    fontWeight: "500",
    lineHeight: 14,
    textAlign: "center",
  },

  retryBtn: {
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginTop: 4,
  },

  retryBtnText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 14,
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },

  label: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    lineHeight: 12,
  },

  reportTemplateBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },

  templateSelector: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  templateSelectorText: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 14,
    flex: 1,
  },

  reportPrimaryButton: {
    minHeight: 46,
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },

  reportPrimaryButtonInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
    minHeight: 46,
  },

  reportPrimaryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  pdfActionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },

  reportSecondaryButton: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    gap: 5,
  },
  reportSecondaryButtonText: {
    fontSize: 11.5,
    fontWeight: "700",
    lineHeight: 14,
  },

  generatingCard: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
  },

  generatingText: {
    fontSize: 13,
    fontWeight: "700",
  },

  previewSection: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },

  previewInfoCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },

  previewHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  previewIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  previewTitle: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 14,
  },

  previewInfoText: {
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "500",
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
});