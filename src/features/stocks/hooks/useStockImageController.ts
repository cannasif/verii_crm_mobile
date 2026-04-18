import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToastStore } from "../../../store/toast";
import { stockImageApi } from "../api/stockImageApi";
import { pickStockImageFromCamera, pickStockImageFromGallery } from "../services/stockPhotoPicker";

interface UseStockImageControllerParams {
  stockId: number | undefined;
}

async function invalidateStockImageQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  sid: number
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["stock", "detail", sid] }),
    queryClient.invalidateQueries({ queryKey: ["stock", "images", sid] }),
  ]);
}

export function useStockImageController({ stockId }: UseStockImageControllerParams) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const [pendingUploadUri, setPendingUploadUri] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (uris: string[]) => {
      if (!stockId) {
        throw new Error(t("common.error"));
      }
      return stockImageApi.upload(stockId, uris);
    },
    onSuccess: async () => {
      setPendingUploadUri(null);
      if (stockId) {
        await invalidateStockImageQueries(queryClient, stockId);
      }
      showToast("success", t("stock.uploadSuccess"));
    },
    onError: (error: Error) => {
      showToast("error", error.message || t("stock.uploadError"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (imageId: number) => stockImageApi.delete(imageId),
    onSuccess: async () => {
      if (stockId) {
        await invalidateStockImageQueries(queryClient, stockId);
      }
      showToast("success", t("stock.deleteImageSuccess"));
    },
    onError: (error: Error) => {
      showToast("error", error.message || t("stock.deleteImageError"));
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (imageId: number) => stockImageApi.setPrimary(imageId),
    onSuccess: async () => {
      if (stockId) {
        await invalidateStockImageQueries(queryClient, stockId);
      }
      showToast("success", t("stock.setPrimarySuccess"));
    },
    onError: (error: Error) => {
      showToast("error", error.message || t("stock.setPrimaryError"));
    },
  });

  const runGalleryPick = useCallback(async () => {
    if (!stockId || uploadMutation.isPending) return;
    const uri = await pickStockImageFromGallery(t);
    if (!uri) return;
    setPendingUploadUri(uri);
  }, [stockId, t, uploadMutation.isPending]);

  const runCameraPick = useCallback(async () => {
    if (!stockId || uploadMutation.isPending) return;
    const uri = await pickStockImageFromCamera(t);
    if (!uri) return;
    setPendingUploadUri(uri);
  }, [stockId, t, uploadMutation.isPending]);

  const onOpenAddImage = useCallback(() => {
    if (!stockId || uploadMutation.isPending) return;
    Alert.alert(t("stock.addImage"), t("customer.chooseImageSource"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("customer.fromGallery"),
        onPress: () => {
          void runGalleryPick();
        },
      },
      {
        text: t("customer.fromCamera"),
        onPress: () => {
          void runCameraPick();
        },
      },
    ]);
  }, [runCameraPick, runGalleryPick, stockId, t, uploadMutation.isPending]);

  const onClearPendingUpload = useCallback(() => {
    setPendingUploadUri(null);
  }, []);

  const onConfirmPendingUpload = useCallback(() => {
    if (pendingUploadUri) {
      uploadMutation.mutate([pendingUploadUri]);
    }
  }, [pendingUploadUri, uploadMutation]);

  const requestDeleteImage = useCallback(
    (imageId: number) => {
      Alert.alert(t("stock.deleteImageTitle"), t("stock.deleteImageMessage"), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            deleteMutation.mutate(imageId);
          },
        },
      ]);
    },
    [deleteMutation, t]
  );

  const setPrimaryImage = useCallback(
    (imageId: number) => {
      setPrimaryMutation.mutate(imageId);
    },
    [setPrimaryMutation]
  );

  const isImageMutationPending = deleteMutation.isPending || setPrimaryMutation.isPending;

  return {
    pendingUploadUri,
    isUploading: uploadMutation.isPending,
    isImageMutationPending,
    onOpenAddImage,
    onClearPendingUpload,
    onConfirmPendingUpload,
    requestDeleteImage,
    setPrimaryImage,
  };
}
