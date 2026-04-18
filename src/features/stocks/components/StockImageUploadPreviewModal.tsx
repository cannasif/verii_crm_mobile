import React from "react";
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from "react-native";
import { Text } from "../../../components/ui/text";

interface StockImageUploadPreviewModalProps {
  visible: boolean;
  uri: string;
  isUploading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  t: (key: string, options?: Record<string, string | number>) => string;
  theme: {
    overlay: string;
    cardBg: string;
    cardBorder: string;
    previewBg: string;
    previewBorder: string;
    text: string;
    textMuted: string;
    accent: string;
    cancelBg: string;
    cancelBorder: string;
  };
}

export function StockImageUploadPreviewModal({
  visible,
  uri,
  isUploading,
  onClose,
  onConfirm,
  t,
  theme,
}: StockImageUploadPreviewModalProps): React.ReactElement | null {
  const { width } = useWindowDimensions();
  const previewMaxW = Math.min(width - 40, 400);
  const previewMaxH = Math.min(340, Math.round(width * 0.78));

  if (!visible) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 14 },
              shadowOpacity: Platform.OS === "ios" ? 0.35 : 0,
              shadowRadius: 24,
              elevation: Platform.OS === "android" ? 16 : 0,
            },
          ]}
        >
          <Text style={[styles.title, { color: theme.text }]}>{t("stock.uploadPreviewTitle")}</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>{t("stock.uploadPreviewHint")}</Text>

          <View
            style={[
              styles.previewFrame,
              {
                backgroundColor: theme.previewBg,
                borderColor: theme.previewBorder,
                maxWidth: previewMaxW,
                maxHeight: previewMaxH,
              },
            ]}
          >
            <Image source={{ uri }} style={styles.previewImage} resizeMode="contain" />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              disabled={isUploading}
              onPress={onClose}
              style={[
                styles.btn,
                styles.btnGhost,
                {
                  backgroundColor: theme.cancelBg,
                  borderColor: theme.cancelBorder,
                  opacity: isUploading ? 0.5 : 1,
                },
              ]}
            >
              <Text style={[styles.btnGhostText, { color: theme.text }]}>{t("common.cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={isUploading}
              onPress={onConfirm}
              style={[
                styles.btn,
                styles.btnPrimary,
                { backgroundColor: theme.accent, opacity: isUploading ? 0.55 : 1 },
              ]}
            >
              {isUploading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.btnPrimaryText}>{t("stock.confirmUpload")}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 19,
  },
  previewFrame: {
    alignSelf: "center",
    width: "100%",
    minHeight: 200,
    borderRadius: 16,
    borderWidth: 2,
    overflow: "hidden",
    marginBottom: 20,
  },
  previewImage: {
    width: "100%",
    height: 260,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  btn: {
    flex: 1,
    minHeight: 50,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhost: {
    borderWidth: 1.5,
  },
  btnGhostText: {
    fontSize: 15,
    fontWeight: "700",
  },
  btnPrimary: {},
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
