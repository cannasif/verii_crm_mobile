import React, { useMemo } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenHeader } from "../../../components/navigation";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useStock, useStockImageController, useStockImagesByStock, useStockRelations } from "../hooks";
import { StockDetailContent } from "../components";
import { sortStockImagesForDisplay } from "../utils/stockImageSort";
import {
  Alert02Icon,
  RefreshIcon,
  PackageIcon,
} from "hugeicons-react-native";

export function StockDetailScreen(): React.ReactElement {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, themeMode } = useUIStore();
  const insets = useSafeAreaInsets();
  const isDark = themeMode === "dark";

  const mainBg = isDark ? "#0c0516" : "#FFFFFF";
  const accentColor = colors.accent || "#db2777";

  const gradientColors = (
    isDark
      ? ["rgba(236, 72, 153, 0.12)", "transparent", "rgba(249, 115, 22, 0.12)"]
      : ["rgba(255, 235, 240, 0.6)", "#FFFFFF", "rgba(255, 240, 225, 0.6)"]
  ) as [string, string, ...string[]];

  const surfaceBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.94)";
  const surfaceSoft = isDark ? "rgba(255,255,255,0.03)" : "rgba(248,250,252,0.88)";
  const borderColor = isDark ? "rgba(236,72,153,0.14)" : "rgba(219,39,119,0.12)";
  const softBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.12)";
  const titleText = isDark ? "#F8FAFC" : "#1F2937";
  const mutedText = isDark ? "#94A3B8" : "#64748B";

  const stockId = id ? Number(id) : undefined;
  const { data: stock, isLoading, isError, refetch } = useStock(stockId);
  const { data: relationsData } = useStockRelations({ stockId });
  const imagesQuery = useStockImagesByStock(stockId);
  const imageCtrl = useStockImageController({ stockId });

  const sortedStockImages = useMemo(() => {
    const source =
      imagesQuery.data !== undefined && imagesQuery.data !== null && !imagesQuery.isError
        ? imagesQuery.data
        : stock?.stockImages;
    return sortStockImagesForDisplay(source);
  }, [imagesQuery.data, imagesQuery.isError, stock?.stockImages]);

  const {
    pendingUploadUri,
    isUploading,
    isImageMutationPending,
    onOpenAddImage,
    onClearPendingUpload,
    onConfirmPendingUpload,
    requestDeleteImage,
    setPrimaryImage,
  } = imageCtrl;

  const stockImageUpload = useMemo(() => {
    if (!stock || stockId == null || Number.isNaN(stockId)) return null;
    return {
      pendingUploadUri,
      isUploading,
      isImageMutationPending,
      onOpenAddImage,
      onClearPendingUpload,
      onConfirmPendingUpload,
      requestDeleteImage,
      setPrimaryImage,
    };
  }, [
    onClearPendingUpload,
    onConfirmPendingUpload,
    onOpenAddImage,
    isImageMutationPending,
    isUploading,
    pendingUploadUri,
    requestDeleteImage,
    setPrimaryImage,
    stock,
    stockId,
  ]);

  const relations = useMemo(() => {
    if (
      stock?.parentRelations &&
      Array.isArray(stock.parentRelations) &&
      stock.parentRelations.length > 0
    ) {
      return stock.parentRelations;
    }
    if (!relationsData?.pages) return [];
    return (
      relationsData.pages
        .flatMap((page) => page.items ?? [])
        .filter((item) => item != null) || []
    );
  }, [stock?.parentRelations, relationsData]);

  return (
    <View style={[styles.mainContainer, { backgroundColor: mainBg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={styles.contentLayer}>
        <ScreenHeader title={t("stock.detail")} showBackButton />

        <View style={styles.body}>
          {isLoading ? (
            <View style={styles.centerState}>
              <View
                style={[
                  styles.stateCard,
                  {
                    backgroundColor: surfaceBg,
                    borderColor,
                  },
                ]}
              >
                <View
                  style={[
                    styles.stateIconWrap,
                    {
                      backgroundColor: isDark
                        ? "rgba(219,39,119,0.12)"
                        : "rgba(219,39,119,0.08)",
                      borderColor: isDark
                        ? "rgba(236,72,153,0.20)"
                        : "rgba(219,39,119,0.16)",
                    },
                  ]}
                >
                  <PackageIcon size={20} color={accentColor} variant="stroke" />
                </View>

                <ActivityIndicator size="small" color={accentColor} style={{ marginBottom: 12 }} />

                <Text style={[styles.stateTitle, { color: titleText }]}>
                  {t("common.loading")}
                </Text>
                <Text style={[styles.stateDesc, { color: mutedText }]}>
                  {t("stock.detail")}
                </Text>
              </View>
            </View>
          ) : isError ? (
            <View style={styles.centerState}>
              <View
                style={[
                  styles.stateCard,
                  {
                    backgroundColor: surfaceBg,
                    borderColor,
                  },
                ]}
              >
                <View
                  style={[
                    styles.stateIconWrap,
                    {
                      backgroundColor: isDark
                        ? "rgba(239,68,68,0.12)"
                        : "rgba(239,68,68,0.08)",
                      borderColor: isDark
                        ? "rgba(239,68,68,0.20)"
                        : "rgba(239,68,68,0.16)",
                    },
                  ]}
                >
                  <Alert02Icon size={20} color={colors.error || "#ef4444"} variant="stroke" />
                </View>

                <Text style={[styles.stateTitle, { color: titleText }]}>
                  {t("common.error")}
                </Text>

                <Text style={[styles.stateDesc, { color: mutedText }]}>
                  Veri yüklenirken bir sorun oluştu.
                </Text>

                <TouchableOpacity
                  onPress={() => refetch()}
                  activeOpacity={0.78}
                  style={[
                    styles.retryBtn,
                    {
                      backgroundColor: surfaceSoft,
                      borderColor: softBorder,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.retryIconWrap,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(255,255,255,0.82)",
                        borderColor: softBorder,
                      },
                    ]}
                  >
                    <RefreshIcon size={15} color={accentColor} variant="stroke" />
                  </View>

                  <Text style={[styles.retryText, { color: titleText }]}>
                    {t("common.retry")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : stock ? (
            <StockDetailContent
              stock={stock}
              stockImages={sortedStockImages}
              relations={relations}
              colors={{ ...colors, background: "transparent" }}
              insets={insets}
              isDark={isDark}
              t={t}
              imageUpload={stockImageUpload}
            />
          ) : (
            <View style={styles.centerState}>
              <View
                style={[
                  styles.stateCard,
                  {
                    backgroundColor: surfaceBg,
                    borderColor,
                  },
                ]}
              >
                <View
                  style={[
                    styles.stateIconWrap,
                    {
                      backgroundColor: isDark
                        ? "rgba(148,163,184,0.10)"
                        : "rgba(148,163,184,0.08)",
                      borderColor: softBorder,
                    },
                  ]}
                >
                  <PackageIcon size={20} color={mutedText} variant="stroke" />
                </View>

                <Text style={[styles.stateTitle, { color: titleText }]}>
                  {t("common.noData")}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  contentLayer: {
    flex: 1,
    zIndex: 1,
  },
  body: {
    flex: 1,
    backgroundColor: "transparent",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingBottom: 36,
  },
  stateCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: 28,
  },
  stateIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
    textAlign: "center",
    letterSpacing: -0.1,
  },
  stateDesc: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 18,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  retryIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
  },
});