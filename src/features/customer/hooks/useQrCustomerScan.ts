import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { captureBusinessCardFromCamera, pickBusinessCardImageFromGallery } from "../services/businessCardCaptureService";
import { createBusinessCardPreviewImage } from "../services/businessCardNativeImageProcessor";
import { detectQrFromImage } from "../services/businessCardQrService";
import type { BusinessCardOcrResult } from "../types/businessCard";

async function withQrImage(result: BusinessCardOcrResult | null, imageUri: string): Promise<BusinessCardOcrResult | null> {
  if (!result) return null;
  const previewUri = await createBusinessCardPreviewImage(imageUri, 420);
  return {
    ...result,
    imageUri,
    previewUri,
  };
}

export function useQrCustomerScan(): {
  scanQrFromCamera: () => Promise<BusinessCardOcrResult | null>;
  pickQrFromGallery: () => Promise<BusinessCardOcrResult | null>;
  isScanningQr: boolean;
  qrError: string | null;
} {
  const { t } = useTranslation();
  const [isScanningQr, setIsScanningQr] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  const scanQr = useCallback(
    async (imageUri: string): Promise<BusinessCardOcrResult | null> => {
      const detected = await detectQrFromImage(imageUri, { timeoutMs: 1200 });
      const parsed = await withQrImage(detected.parsedCard, imageUri);
      if (!parsed) {
        setQrError(t("customer.qrNotFound"));
        return null;
      }
      return parsed;
    },
    [t]
  );

  const scanQrFromCamera = useCallback(async (): Promise<BusinessCardOcrResult | null> => {
    setQrError(null);
    setIsScanningQr(true);
    try {
      const { imageUri } = await captureBusinessCardFromCamera();
      if (!imageUri) return null;
      return await scanQr(imageUri);
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      if (message === "CAMERA_PERMISSION_REQUIRED") {
        setQrError(t("customer.cameraPermissionError"));
      } else {
        setQrError(message || t("customer.qrScanFailed"));
      }
      return null;
    } finally {
      setIsScanningQr(false);
    }
  }, [scanQr, t]);

  const pickQrFromGallery = useCallback(async (): Promise<BusinessCardOcrResult | null> => {
    setQrError(null);
    setIsScanningQr(true);
    try {
      const imageUri = await pickBusinessCardImageFromGallery();
      if (!imageUri) return null;
      return await scanQr(imageUri);
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      if (message === "MEDIA_LIBRARY_PERMISSION_REQUIRED") {
        setQrError(t("customer.imagePermissionRequired"));
      } else {
        setQrError(message || t("customer.qrGalleryPickFailed"));
      }
      return null;
    } finally {
      setIsScanningQr(false);
    }
  }, [scanQr, t]);

  return {
    scanQrFromCamera,
    pickQrFromGallery,
    isScanningQr,
    qrError,
  };
}
