import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Sharing from "expo-sharing";
import { WebView } from "react-native-webview";
import { Cancel01Icon, Pdf01Icon, Share05Icon, ViewIcon } from "hugeicons-react-native";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useToastStore } from "../../../store/toast";
import { canPreviewPdfInApp, openPdfExternallyAsync } from "../../../lib/pdf";
import { createV3riiQuotationPreviewPdf } from "../utils/createV3riiQuotationPreviewPdf";
import type { QuotationPreviewPdfInput } from "../utils/quotationPreviewPdf.types";

const REPORT_PDF_PRIMARY_GRADIENT = {
  dark: ["#ea580c", "#e11d48", "#db2777"] as const,
  light: ["#fb923c", "#fb7185", "#ec4899"] as const,
};

interface QuotationPreviewPdfDialogProps {
  visible: boolean;
  onClose: () => void;
  buildInput: (draft: boolean) => Promise<QuotationPreviewPdfInput>;
  validateBeforeOpen?: () => string | null;
}

export function QuotationPreviewPdfDialog({
  visible,
  onClose,
  buildInput,
  validateBeforeOpen,
}: QuotationPreviewPdfDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, themeMode } = useUIStore();
  const showToast = useToastStore((s) => s.showToast);
  const { height: windowHeight } = useWindowDimensions();

  const [generatingKind, setGeneratingKind] = useState<"draft" | "final" | null>(null);
  const [pdfFileUri, setPdfFileUri] = useState<string | null>(null);

  const isGenerating = generatingKind != null;
  const isDark = themeMode === "dark";
  const inAppPdfPreviewAvailable = useMemo(() => canPreviewPdfInApp(), []);
  const pdfViewerHeight = useMemo(() => Math.max(280, windowHeight * 0.38), [windowHeight]);

  const shellBg = isDark ? colors.card : "#FFFFFF";
  const border = isDark ? "rgba(255,255,255,0.12)" : "rgba(148,163,184,0.26)";
  const muted = colors.textMuted;

  const resetState = useCallback(() => {
    setPdfFileUri(null);
    setGeneratingKind(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const generatePdf = useCallback(
    async (draft: boolean) => {
      const validationError = validateBeforeOpen?.() ?? null;
      if (validationError) {
        showToast("error", validationError);
        return;
      }

      setGeneratingKind(draft ? "draft" : "final");
      try {
        const input = await buildInput(draft);
        const fileUri = await createV3riiQuotationPreviewPdf(input);
        setPdfFileUri(fileUri);

        if (!draft && !inAppPdfPreviewAvailable) {
          void openPdfExternallyAsync(fileUri).then((result) => {
            if (!result.opened && result.reason === "no_app") {
              showToast("error", t("report.viewerNotAvailable"));
            }
          });
        }

        showToast("success", t("report.generated"));
      } catch (error) {
        const message = error instanceof Error ? error.message : t("report.generateError");
        showToast("error", message);
      } finally {
        setGeneratingKind(null);
      }
    },
    [buildInput, inAppPdfPreviewAvailable, showToast, t, validateBeforeOpen]
  );

  const handleOpenPdf = useCallback(async () => {
    if (!pdfFileUri) return;
    const result = await openPdfExternallyAsync(pdfFileUri);
    if (!result.opened) {
      showToast(
        "error",
        t(result.reason === "no_app" ? "report.viewerNotAvailable" : "report.openError")
      );
    }
  }, [pdfFileUri, showToast, t]);

  const handleSharePdf = useCallback(async () => {
    if (!pdfFileUri) return;

    try {
      const shareUri = pdfFileUri.startsWith("file://") ? pdfFileUri : `file://${pdfFileUri}`;
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        showToast("error", t("report.shareNotAvailable"));
        return;
      }

      await Sharing.shareAsync(shareUri, {
        mimeType: "application/pdf",
        dialogTitle: t("report.shareTitle"),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("report.saveError");
      showToast("error", message);
    }
  }, [pdfFileUri, showToast, t]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: shellBg,
              borderColor: border,
              paddingBottom: insets.bottom + 14,
              maxHeight: windowHeight * 0.92,
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: border }]}>
            <View style={styles.headerTextWrap}>
              <Text style={[styles.title, { color: colors.text }]}>V3RII ŞABLON</Text>
              <Text style={[styles.subtitle, { color: muted }]}>Önizle ve Paylaş</Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Cancel01Icon size={20} color={muted} variant="stroke" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: border }]}
              onPress={() => void generatePdf(true)}
              disabled={isGenerating}
              activeOpacity={0.88}
            >
              {generatingKind === "draft" ? (
                <>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={[styles.secondaryButtonText, { color: colors.accent }]}>
                    {t("report.generatingPdf")}
                  </Text>
                </>
              ) : (
                <>
                  <ViewIcon size={14} color={colors.accent} variant="stroke" strokeWidth={2} />
                  <Text style={[styles.secondaryButtonText, { color: colors.accent }]}>Taslak Önizle</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButtonWrap}
              onPress={() => void generatePdf(false)}
              disabled={isGenerating}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={isDark ? REPORT_PDF_PRIMARY_GRADIENT.dark : REPORT_PDF_PRIMARY_GRADIENT.light}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButton}
              >
                {generatingKind === "final" ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>{t("report.generatingPdf")}</Text>
                  </>
                ) : (
                  <>
                    <Pdf01Icon size={14} color="#FFFFFF" variant="stroke" strokeWidth={2} />
                    <Text style={styles.primaryButtonText}>{t("report.generatePdf")}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {pdfFileUri ? (
            <View style={styles.shareRow}>
              <TouchableOpacity
                style={[styles.secondaryButton, { flex: 1, borderColor: border }]}
                onPress={() => void handleOpenPdf()}
                activeOpacity={0.88}
              >
                <ViewIcon size={14} color={colors.accent} variant="stroke" strokeWidth={2} />
                <Text style={[styles.secondaryButtonText, { color: colors.accent }]}>
                  {t("report.openPdf")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, { flex: 1, borderColor: border }]}
                onPress={() => void handleSharePdf()}
                activeOpacity={0.88}
              >
                <Share05Icon size={14} color={colors.accentSecondary || "#f97316"} variant="stroke" strokeWidth={2} />
                <Text style={[styles.secondaryButtonText, { color: colors.accentSecondary || "#f97316" }]}>
                  {t("report.share")}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {isGenerating ? (
            <View
              style={[
                styles.generatingCard,
                {
                  borderColor: isDark ? "rgba(251,146,60,0.28)" : "rgba(251,113,133,0.24)",
                  backgroundColor: isDark ? "rgba(234,88,12,0.10)" : "rgba(251,113,133,0.08)",
                  height: pdfViewerHeight,
                },
              ]}
            >
              <ActivityIndicator color={isDark ? "#fb7185" : "#e11d48"} size="large" />
              <Text style={[styles.generatingText, { color: isDark ? "#fda4af" : "#db2777" }]}>
                {t("report.generatingPdf")}
              </Text>
            </View>
          ) : !pdfFileUri ? (
            <View style={[styles.infoCard, { borderColor: border }]}>
              <Text style={[styles.infoText, { color: muted }]}>
                Taslak önizlemede filigran görünür. Paylaşım ve indirme için filigransız PDF oluşturun.
              </Text>
            </View>
          ) : inAppPdfPreviewAvailable ? (
            <View style={[styles.previewCard, { borderColor: border, height: pdfViewerHeight }]}>
              <WebView
                source={{ uri: pdfFileUri }}
                originWhitelist={["file://", "content://"]}
                style={styles.webView}
                scalesPageToFit
                nestedScrollEnabled
              />
            </View>
          ) : (
            <View style={[styles.infoCard, { borderColor: border }]}>
              <Text style={[styles.infoText, { color: muted }]}>{t("report.androidPreviewFallback")}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "500",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  shareRow: {
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonWrap: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  primaryButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 10,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  secondaryButtonText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  infoText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
  },
  generatingCard: {
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  generatingText: {
    fontSize: 14,
    fontWeight: "700",
  },
  previewCard: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  webView: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
