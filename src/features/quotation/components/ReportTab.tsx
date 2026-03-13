import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { useTranslation } from "react-i18next";
import { Buffer } from "buffer";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { WebView } from "react-native-webview";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useToastStore } from "../../../store/toast";
import { useReportTemplateList, useGenerateReportPdf } from "../hooks";
import { PickerModal } from "./PickerModal";
import type { DocumentRuleTypeValue } from "../types";

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

export function ReportTab({
  entityId,
  ruleType,
  builtInTemplates = [],
}: ReportTabProps): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useUIStore();
  const showToast = useToastStore((s) => s.showToast);
  const { height: windowHeight } = useWindowDimensions();
  const { data: templates, isLoading: templatesLoading, isError: templatesError, error: templatesErrorObj, refetch } = useReportTemplateList(ruleType);
  const generatePdf = useGenerateReportPdf();
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | string | undefined>(undefined);
  const [templatePickerVisible, setTemplatePickerVisible] = useState(false);
  const [pdfFileUri, setPdfFileUri] = useState<string | null>(null);

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
      void builtInTemplate
        .generate()
        .then((fileUri) => {
          setPdfFileUri(fileUri);
          showToast("success", t("report.generated"));
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : t("report.generateError");
          showToast("error", message);
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
  }, [selectedTemplateId, entityId, ruleType, generatePdf, showToast, t, builtInTemplates]);

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
    () =>
      [
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
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (templatesError) {
    return (
      <View style={[styles.centered, styles.errorBox, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {templatesErrorObj?.message ?? t("common.error")}
        </Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.accent }]}
          onPress={() => refetch()}
        >
          <Text style={styles.retryBtnText}>{t("common.retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (templates.length === 0 && builtInTemplates.length === 0) {
    return (
      <View style={[styles.centered, styles.emptyBox, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {t("report.noTemplates")}
        </Text>
      </View>
    );
  }

  return (
    <FlatListScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t("report.template")}
        </Text>
        <TouchableOpacity
          style={[styles.pickerBtn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
          onPress={() => setTemplatePickerVisible(true)}
        >
          <Text style={[styles.pickerTxt, { color: colors.text }]} numberOfLines={1}>
            {selectedTemplate?.title ?? t("report.selectTemplate")}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.generateBtn, { backgroundColor: colors.accent }]}
          onPress={handleGeneratePdf}
          disabled={generatePdf.isPending || selectedTemplateId == null}
        >
          {generatePdf.isPending ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.generateBtnText}>{t("report.generatePdf")}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.shareBtn,
            { backgroundColor: pdfFileUri != null ? colors.accent : colors.textMuted },
          ]}
          onPress={handleSharePdf}
          disabled={pdfFileUri == null}
        >
          <Text style={styles.shareBtnText}>{t("report.share")}</Text>
        </TouchableOpacity>
      </View>
      {pdfFileUri != null && (
        <View style={[styles.previewSection, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("report.preview")}
          </Text>
          <View style={[styles.pdfViewerWrapper, { height: pdfViewerHeight, backgroundColor: colors.backgroundSecondary }]}>
            <WebView
              source={{ uri: pdfFileUri }}
              originWhitelist={["file://", "content://"]}
              style={styles.pdfWebView}
              scalesPageToFit
              nestedScrollEnabled
            />
          </View>
        </View>
      )}
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
    </FlatListScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorBox: { flex: 1 },
  errorText: { fontSize: 14, textAlign: "center", marginBottom: 16 },
  retryBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  retryBtnText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  emptyBox: { flex: 1 },
  emptyText: { fontSize: 15, textAlign: "center" },
  section: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  pickerBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  pickerTxt: { fontSize: 15 },
  actionsRow: { marginBottom: 16, gap: 12 },
  generateBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  generateBtnText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  shareBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  shareBtnText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  previewSection: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  pdfViewerWrapper: { borderRadius: 8, overflow: "hidden" },
  pdfWebView: { flex: 1, backgroundColor: "transparent" },
});
