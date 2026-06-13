import { useCallback, useState } from "react";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../../store/auth";
import { useToastStore } from "../../../store/toast";
import { openPdfExternallyAsync } from "../../../lib/pdf";
import type { QuotationGetDto } from "../types";
import {
  buildQuotationPdfFileName,
  generateQuotationDraftPreviewPdf,
} from "../utils/generateQuotationDraftPreviewPdf";

export function useQuotationListRowActions(): {
  isPdfBusy: boolean;
  shareQuotationPdfViaWhatsApp: (quotation: QuotationGetDto) => Promise<void>;
  downloadQuotationDraftPdf: (quotation: QuotationGetDto) => Promise<void>;
} {
  const { i18n, t } = useTranslation();
  const branch = useAuthStore((state) => state.branch);
  const showToast = useToastStore((state) => state.showToast);
  const [isPdfBusy, setIsPdfBusy] = useState(false);

  const generatePdf = useCallback(
    async (quotation: QuotationGetDto): Promise<string> => {
      try {
        return await generateQuotationDraftPreviewPdf(quotation, branch, i18n.language);
      } catch (error) {
        if (error instanceof Error && error.message === "QUOTATION_PDF_NO_LINES") {
          throw new Error(t("quotation.rowActions.noLinesForPdf"));
        }
        throw error;
      }
    },
    [branch, i18n.language, t]
  );

  const shareQuotationPdfViaWhatsApp = useCallback(
    async (quotation: QuotationGetDto): Promise<void> => {
      if (isPdfBusy) return;

      setIsPdfBusy(true);
      try {
        const fileUri = await generatePdf(quotation);
        const shareUri = fileUri.startsWith("file://") ? fileUri : `file://${fileUri}`;
        const isAvailable = await Sharing.isAvailableAsync();

        if (!isAvailable) {
          showToast("error", t("report.shareNotAvailable"));
          return;
        }

        await Sharing.shareAsync(shareUri, {
          mimeType: "application/pdf",
          dialogTitle: t("quotation.rowActions.sharePdfTitle"),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t("report.generateError");
        showToast("error", message);
      } finally {
        setIsPdfBusy(false);
      }
    },
    [generatePdf, isPdfBusy, showToast, t]
  );

  const downloadQuotationDraftPdf = useCallback(
    async (quotation: QuotationGetDto): Promise<void> => {
      if (isPdfBusy) return;

      setIsPdfBusy(true);
      try {
        const fileUri = await generatePdf(quotation);
        const fileName = buildQuotationPdfFileName(quotation);
        const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;

        if (!baseDir) {
          showToast("error", t("report.saveError"));
          return;
        }

        const normalizedSource = fileUri.startsWith("file://") ? fileUri : `file://${fileUri}`;
        const destination = `${baseDir}${fileName}`;

        await FileSystem.copyAsync({
          from: normalizedSource,
          to: destination,
        });

        const savedUri = destination.startsWith("file://")
          ? destination
          : `file://${destination}`;

        if (Platform.OS === "android") {
          const openResult = await openPdfExternallyAsync(savedUri);
          if (!openResult.opened) {
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
              await Sharing.shareAsync(savedUri, {
                mimeType: "application/pdf",
                dialogTitle: t("quotation.rowActions.downloadPdfTitle"),
              });
            }
          }
        } else {
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(savedUri, {
              mimeType: "application/pdf",
              dialogTitle: t("quotation.rowActions.downloadPdfTitle"),
              UTI: "com.adobe.pdf",
            });
          }
        }

        showToast("success", t("quotation.rowActions.downloadSuccess"));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t("report.saveError");
        showToast("error", message);
      } finally {
        setIsPdfBusy(false);
      }
    },
    [generatePdf, isPdfBusy, showToast, t]
  );

  return {
    isPdfBusy,
    shareQuotationPdfViaWhatsApp,
    downloadQuotationDraftPdf,
  };
}
