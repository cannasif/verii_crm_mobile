import React, { useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Animated, TouchableOpacity, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Text } from "./ui/text";
import { useToastStore, type Toast as ToastType, type ToastType as ToastVariant } from "../store/toast";
import { rtlEndMargin, rtlRow, rtlStartMargin, rtlTextAlign, rtlWritingDirection } from "../lib/rtl";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TOAST_WIDTH = SCREEN_WIDTH - 40;

interface ToastItemProps {
  toast: ToastType;
  onHide: (id: string) => void;
}

const getToastStyles = (type: ToastVariant): { backgroundColor: string; iconColor: string; icon: string } => {
  switch (type) {
    case "success":
      return { backgroundColor: "#10B981", iconColor: "#FFFFFF", icon: "✓" };
    case "error":
      return { backgroundColor: "#EF4444", iconColor: "#FFFFFF", icon: "✕" };
    case "warning":
      return { backgroundColor: "#F59E0B", iconColor: "#FFFFFF", icon: "!" };
    case "info":
      return { backgroundColor: "#3B82F6", iconColor: "#FFFFFF", icon: "i" };
    default:
      return { backgroundColor: "#6B7280", iconColor: "#FFFFFF", icon: "i" };
  }
};

function ToastItem({ toast, onHide }: ToastItemProps): React.ReactElement {
  const { i18n } = useTranslation();
  const language = i18n.language;
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateY, opacity]);

  const handleHide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide(toast.id);
    });
  }, [translateY, opacity, onHide, toast.id]);

  const toastStyles = getToastStyles(toast.type);

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          backgroundColor: toastStyles.backgroundColor,
          flexDirection: rtlRow(language),
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={[styles.iconContainer, rtlEndMargin(12, language)]}>
        <Text style={[styles.icon, { color: toastStyles.iconColor }]}>{toastStyles.icon}</Text>
      </View>
      <Text
        style={[
          styles.message,
          { textAlign: rtlTextAlign(language), writingDirection: rtlWritingDirection(language) },
        ]}
        numberOfLines={2}
      >
        {toast.message}
      </Text>
      <TouchableOpacity onPress={handleHide} style={[styles.closeButton, rtlStartMargin(12, language)]}>
        <Text style={styles.closeIcon}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ToastContainer(): React.ReactElement | null {
  const insets = useSafeAreaInsets();
  const { toasts, hideToast } = useToastStore();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { top: insets.top + 10 }]} pointerEvents="box-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onHide={hideToast} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
    pointerEvents: "box-none",
  },
  toastContainer: {
    width: TOAST_WIDTH,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 14,
    fontWeight: "700",
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
  },
  closeIcon: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "600",
  },
});
