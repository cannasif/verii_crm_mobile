import { useCallback, useState } from "react";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../../store/auth";
import { useToastStore } from "../../../store/toast";
import { openPdfExternallyAsync } from "../../../lib/pdf";
import type { OrderGetDto } from "../types";
import {
  buildOrderPdfFileName,
  generateOrderDraftPreviewPdf,
} from "../utils/generateOrderDraftPreviewPdf";

export function useOrderListRowActions(): {
  isPdfBusy: boolean;
  shareOrderPdfViaWhatsApp: (order: OrderGetDto) => Promise<void>;
  downloadOrderDraftPdf: (order: OrderGetDto) => Promise<void>;
} {
  const { i18n, t } = useTranslation();
  const branch = useAuthStore((state) => state.branch);
  const showToast = useToastStore((state) => state.showToast);
  const [isPdfBusy, setIsPdfBusy] = useState(false);

  const generatePdf = useCallback(
    async (order: OrderGetDto): Promise<string> => {
      try {
        return await generateOrderDraftPreviewPdf(order, branch, i18n.language, t);
      } catch (error) {
        if (error instanceof Error && error.message === "ORDER_PDF_NO_LINES") {
          throw new Error(t("order.rowActions.noLinesForPdf"));
        }
        throw error;
      }
    },
    [branch, i18n.language, t]
  );

  const shareOrderPdfViaWhatsApp = useCallback(
    async (order: OrderGetDto): Promise<void> => {
      if (isPdfBusy) return;

      setIsPdfBusy(true);
      try {
        const fileUri = await generatePdf(order);
        const shareUri = fileUri.startsWith("file://") ? fileUri : `file://${fileUri}`;
        const isAvailable = await Sharing.isAvailableAsync();

        if (!isAvailable) {
          showToast("error", t("report.shareNotAvailable"));
          return;
        }

        await Sharing.shareAsync(shareUri, {
          mimeType: "application/pdf",
          dialogTitle: t("order.rowActions.sharePdfTitle"),
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

  const downloadOrderDraftPdf = useCallback(
    async (order: OrderGetDto): Promise<void> => {
      if (isPdfBusy) return;

      setIsPdfBusy(true);
      try {
        const fileUri = await generatePdf(order);
        const fileName = buildOrderPdfFileName(order);
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
                dialogTitle: t("order.rowActions.downloadPdfTitle"),
              });
            }
          }
        } else {
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(savedUri, {
              mimeType: "application/pdf",
              dialogTitle: t("order.rowActions.downloadPdfTitle"),
              UTI: "com.adobe.pdf",
            });
          }
        }

        showToast("success", t("order.rowActions.downloadSuccess"));
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
    shareOrderPdfViaWhatsApp,
    downloadOrderDraftPdf,
  };
}
