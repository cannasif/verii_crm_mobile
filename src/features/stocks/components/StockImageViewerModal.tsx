import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../../../components/ui/text";
import type { StockImageDto } from "../types";
import { Cancel01Icon, Award01Icon, Delete02Icon } from "hugeicons-react-native";

/** Appends alpha byte to #RRGGBB for RN #RRGGBBAA colors. */
function hexWithAlpha(hex: string, alpha01: number): string {
  if (!hex.startsWith("#")) return hex;
  const body = hex.slice(1);
  if (body.length !== 6) return hex;
  const a = Math.min(255, Math.max(0, Math.round(alpha01 * 255)));
  return `#${body}${a.toString(16).padStart(2, "0").toUpperCase()}`;
}

interface StockImageViewerModalProps {
  visible: boolean;
  images: StockImageDto[];
  initialIndex: number;
  onClose: () => void;
  getImageUri: (filePath: string) => string;
  onRequestDelete: (imageId: number) => void;
  onSetPrimary: (imageId: number) => void;
  isMutationPending: boolean;
  isDark: boolean;
  t: (key: string, options?: Record<string, string | number>) => string;
  theme: {
    accent: string;
    danger: string;
  };
}

export function StockImageViewerModal({
  visible,
  images,
  initialIndex,
  onClose,
  getImageUri,
  onRequestDelete,
  onSetPrimary,
  isMutationPending,
  isDark,
  t,
  theme,
}: StockImageViewerModalProps): React.ReactElement | null {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<StockImageDto>>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const ui = useMemo(() => {
    if (isDark) {
      return {
        root: "#020617",
        topBarBg: "rgba(2,6,23,0.96)",
        topBarBorder: "rgba(248,250,252,0.1)",
        iconBtnBg: "rgba(255,255,255,0.06)",
        iconBtnBorder: "rgba(248,250,252,0.14)",
        chromeText: "#F1F5F9",
        pageBg: "#020617",
        bottomBarBg: "rgba(2,6,23,0.97)",
        bottomBarBorder: "rgba(248,250,252,0.1)",
        btnPrimaryBg: hexWithAlpha(theme.accent, 0.14),
        btnPrimaryBorder: hexWithAlpha(theme.accent, 0.42),
        btnDangerBg: hexWithAlpha(theme.danger, 0.12),
        btnDangerBorder: hexWithAlpha(theme.danger, 0.38),
        btnMutedBg: "rgba(148,163,184,0.12)",
        btnMutedBorder: "rgba(148,163,184,0.32)",
        labelPrimary: "#F8FAFC",
        labelDanger: "#FECACA",
        mutedFg: "#94A3B8",
        spinColor: "#F8FAFC",
      };
    }
    return {
      root: "#F1F5F9",
      topBarBg: "rgba(255,255,255,0.96)",
      topBarBorder: "rgba(148,163,184,0.2)",
      iconBtnBg: "rgba(255,255,255,0.95)",
      iconBtnBorder: "rgba(148,163,184,0.28)",
      chromeText: "#0F172A",
      pageBg: "#E2E8F0",
      bottomBarBg: "rgba(255,255,255,0.97)",
      bottomBarBorder: "rgba(148,163,184,0.22)",
      btnPrimaryBg: hexWithAlpha(theme.accent, 0.1),
      btnPrimaryBorder: hexWithAlpha(theme.accent, 0.34),
      btnDangerBg: hexWithAlpha(theme.danger, 0.08),
      btnDangerBorder: hexWithAlpha(theme.danger, 0.3),
      btnMutedBg: "rgba(148,163,184,0.14)",
      btnMutedBorder: "rgba(148,163,184,0.35)",
      labelPrimary: "#BE185D",
      labelDanger: "#DC2626",
      mutedFg: "#64748B",
      spinColor: "#475569",
    };
  }, [isDark, theme.accent, theme.danger]);

  const safeIndex = useMemo(() => {
    if (images.length === 0) return 0;
    return Math.min(Math.max(0, initialIndex), images.length - 1);
  }, [images.length, initialIndex]);

  React.useEffect(() => {
    if (visible) {
      setActiveIndex(safeIndex);
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index: safeIndex, animated: false });
      });
    }
  }, [visible, safeIndex]);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const next = Math.round(x / Math.max(1, width));
      if (next >= 0 && next < images.length) {
        setActiveIndex(next);
      }
    },
    [images.length, width]
  );

  const current = images[activeIndex];

  const renderPage = useCallback(
    ({ item }: { item: StockImageDto }) => {
      const uri = getImageUri(item.filePath);
      return (
        <View style={[styles.page, { width, backgroundColor: ui.pageBg }]}>
          <Image source={{ uri }} style={[styles.fullImage, { height: height * 0.72 }]} resizeMode="contain" />
        </View>
      );
    },
    [getImageUri, height, ui.pageBg, width]
  );

  if (!visible || images.length === 0) {
    return null;
  }

  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: ui.root }]}>
        <View
          style={[
            styles.topBar,
            {
              paddingTop: insets.top + 8,
              backgroundColor: ui.topBarBg,
              borderBottomColor: ui.topBarBorder,
            },
          ]}
        >
          <TouchableOpacity
            onPress={onClose}
            hitSlop={12}
            style={[
              styles.iconBtn,
              { backgroundColor: ui.iconBtnBg, borderColor: ui.iconBtnBorder },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
          >
            <Cancel01Icon size={22} color={ui.chromeText} variant="stroke" />
          </TouchableOpacity>
          <Text style={[styles.counter, { color: ui.chromeText }]}>
            {t("stock.viewerCounter", { current: activeIndex + 1, total: images.length })}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <FlatList
          key={images.map((item) => item.id).join("-")}
          ref={listRef}
          data={images}
          keyExtractor={(item) => String(item.id)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={safeIndex}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          onMomentumScrollEnd={onMomentumScrollEnd}
          renderItem={renderPage}
          onScrollToIndexFailed={(info) => {
            requestAnimationFrame(() => {
              listRef.current?.scrollToIndex({ index: info.index, animated: false });
            });
          }}
        />

        <View
          style={[
            styles.bottomBar,
            {
              paddingBottom: insets.bottom + 14,
              backgroundColor: ui.bottomBarBg,
              borderTopColor: ui.bottomBarBorder,
            },
          ]}
        >
          {current ? (
            <View style={styles.bottomInner}>
              <TouchableOpacity
                disabled={isMutationPending || current.isPrimary}
                onPress={() => {
                  onSetPrimary(current.id);
                }}
                style={[
                  styles.actionBtnSoft,
                  {
                    backgroundColor:
                      current.isPrimary || isMutationPending ? ui.btnMutedBg : ui.btnPrimaryBg,
                    borderColor:
                      current.isPrimary || isMutationPending ? ui.btnMutedBorder : ui.btnPrimaryBorder,
                    opacity: current.isPrimary || isMutationPending ? 0.85 : 1,
                  },
                ]}
              >
                {isMutationPending ? (
                  <ActivityIndicator size="small" color={ui.spinColor} />
                ) : (
                  <>
                    <Award01Icon
                      size={18}
                      color={
                        current.isPrimary || isMutationPending ? ui.mutedFg : ui.labelPrimary
                      }
                      variant="stroke"
                    />
                    <Text
                      style={[
                        styles.actionLabelSoft,
                        {
                          color:
                            current.isPrimary || isMutationPending ? ui.mutedFg : ui.labelPrimary,
                        },
                      ]}
                    >
                      {current.isPrimary ? t("stock.primaryBadge") : t("stock.setAsPrimary")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                disabled={isMutationPending}
                onPress={() => {
                  onRequestDelete(current.id);
                }}
                style={[
                  styles.actionBtnSoft,
                  {
                    backgroundColor: isMutationPending ? ui.btnMutedBg : ui.btnDangerBg,
                    borderColor: isMutationPending ? ui.btnMutedBorder : ui.btnDangerBorder,
                    opacity: isMutationPending ? 0.85 : 1,
                  },
                ]}
              >
                <Delete02Icon
                  size={18}
                  color={isMutationPending ? ui.mutedFg : ui.labelDanger}
                  variant="stroke"
                />
                <Text
                  style={[
                    styles.actionLabelSoft,
                    { color: isMutationPending ? ui.mutedFg : ui.labelDanger },
                  ]}
                >
                  {t("stock.deleteImage")}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    fontSize: 14,
    fontWeight: "700",
  },
  page: {
    alignItems: "center",
    justifyContent: "center",
  },
  fullImage: {
    width: "100%",
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bottomInner: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtnSoft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionLabelSoft: {
    fontSize: 14,
    fontWeight: "600",
  },
});
