import React, { useMemo, useCallback, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { Text } from "../../../components/ui/text";
import { getApiBaseUrl } from "../../../constants/config";
import type { StockGetDto, StockRelationDto, StockImageDto } from "../types";
import {
  PackageIcon,
  Image02Icon,
  Image01Icon,
  Add01Icon,
  LinkSquare02Icon,
  Tag01Icon,
  Layers01Icon,
  Calendar03Icon,
  Store03Icon,
  CheckmarkCircle02Icon,
  CancelCircleIcon,
  Note01Icon,
} from "hugeicons-react-native";
import { StockImageUploadPreviewModal } from "./StockImageUploadPreviewModal";
import { StockImageViewerModal } from "./StockImageViewerModal";

function DetailRow({
  label,
  value,
  icon,
  theme,
  isLast = false,
  emphasizeValue = false,
}: {
  label: string;
  value: string | number | undefined | null;
  icon?: React.ReactNode;
  theme: {
    cardBg: string;
    cardBorder: string;
    surfaceSoft: string;
    rowBg: string;
    rowBorder: string;
    labelBg: string;
    labelBorder: string;
    title: string;
    text: string;
    textMuted: string;
    textSoft: string;
    accent: string;
    success: string;
    danger: string;
    warning: string;
  };
  isLast?: boolean;
  emphasizeValue?: boolean;
}): React.ReactElement {
  const displayValue =
    value !== undefined && value !== null && String(value).trim() !== ""
      ? String(value)
      : "-";

  const isEmpty = displayValue === "-";

  return (
    <View
      style={[
        styles.detailRowCard,
        {
          backgroundColor: theme.rowBg,
          borderColor: theme.rowBorder,
          marginBottom: isLast ? 0 : 10,
        },
      ]}
    >
      <View style={styles.detailRowInner}>
        <View
          style={[
            styles.detailLabelBox,
            {
              backgroundColor: theme.labelBg,
              borderColor: theme.labelBorder,
            },
          ]}
        >
          {icon ? <View style={styles.detailIconWrap}>{icon}</View> : null}
          <Text style={[styles.detailLabel, { color: theme.textMuted }]} numberOfLines={1}>
            {label}
          </Text>
        </View>

        <View style={styles.detailValueWrap}>
          <Text
            style={[
              styles.detailValue,
              {
                color: isEmpty ? theme.textMuted : theme.text,
                opacity: isEmpty ? 0.85 : 1,
              },
              emphasizeValue && !isEmpty && { color: theme.accent },
            ]}
            numberOfLines={2}
          >
            {displayValue}
          </Text>
        </View>
      </View>
    </View>
  );
}

function SectionHeader({
  title,
  theme,
}: {
  title: string;
  theme: {
    accent: string;
    text: string;
  };
}): React.ReactElement {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionAccentBar, { backgroundColor: theme.accent }]} />
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
    </View>
  );
}

export interface StockImageUploadActions {
  pendingUploadUri: string | null;
  isUploading: boolean;
  isImageMutationPending: boolean;
  onOpenAddImage: () => void | Promise<void>;
  onClearPendingUpload: () => void;
  onConfirmPendingUpload: () => void;
  requestDeleteImage: (imageId: number) => void;
  setPrimaryImage: (imageId: number) => void;
}

interface StockDetailContentProps {
  stock: StockGetDto | undefined;
  stockImages: StockImageDto[];
  relations: StockRelationDto[];
  colors: Record<string, string>;
  insets: { bottom: number };
  isDark: boolean;
  t: (key: string, options?: Record<string, string | number>) => string;
  imageUpload?: StockImageUploadActions | null;
}

type TabType = "details" | "images" | "relations";

export function StockDetailContent({
  stock,
  stockImages,
  relations,
  colors,
  insets,
  isDark,
  t,
  imageUpload = null,
}: StockDetailContentProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<TabType>("details");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const theme = useMemo(
    () => ({
      cardBg: colors.card ?? "rgba(255,255,255,0.94)",
      cardBorder: colors.cardBorder ?? "rgba(148,163,184,0.16)",
      surfaceSoft:
        colors.background === "transparent"
          ? "rgba(255,255,255,0.05)"
          : "rgba(248,250,252,0.96)",
      rowBg:
        colors.background === "transparent"
          ? "rgba(255,255,255,0.03)"
          : "#FCFCFD",
      rowBorder:
        colors.background === "transparent"
          ? "rgba(219,39,119,0.14)"
          : "rgba(226,232,240,0.95)",
      labelBg:
        colors.background === "transparent"
          ? "rgba(219,39,119,0.08)"
          : "rgba(244,114,182,0.08)",
      labelBorder:
        colors.background === "transparent"
          ? "rgba(219,39,119,0.16)"
          : "rgba(244,114,182,0.16)",
      title: colors.text ?? "#0F172A",
      text: colors.text ?? "#0F172A",
      textMuted: colors.textMuted ?? "#64748B",
      textSoft: colors.textSecondary ?? colors.textMuted ?? "#64748B",
      accent: colors.accent ?? "#db2777",
      success: colors.success ?? "#10B981",
      danger: colors.error ?? "#EF4444",
      warning: "#F59E0B",
    }),
    [colors]
  );

  const openStockViewer = useCallback((index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  }, []);

  useEffect(() => {
    if (viewerOpen && stockImages.length === 0) {
      setViewerOpen(false);
    }
  }, [stockImages.length, viewerOpen]);

  useEffect(() => {
    if (viewerOpen && viewerIndex >= stockImages.length && stockImages.length > 0) {
      setViewerIndex(stockImages.length - 1);
    }
  }, [stockImages.length, viewerIndex, viewerOpen]);

  const previewModalTheme = useMemo(
    () => ({
      overlay: isDark ? "rgba(2,6,23,0.94)" : "rgba(15,23,42,0.86)",
      cardBg: isDark ? "#0B1220" : "#FFFFFF",
      cardBorder: isDark ? "rgba(248,250,252,0.22)" : "rgba(219,39,119,0.28)",
      previewBg: isDark ? "#020617" : "#EEF2FF",
      previewBorder: isDark ? "rgba(148,163,184,0.45)" : "rgba(100,116,139,0.45)",
      text: isDark ? "#F8FAFC" : theme.text,
      textMuted: isDark ? "#94A3B8" : theme.textMuted,
      accent: theme.accent,
      cancelBg: isDark ? "rgba(30,41,59,0.95)" : "#F1F5F9",
      cancelBorder: isDark ? "rgba(148,163,184,0.35)" : "rgba(148,163,184,0.55)",
    }),
    [isDark, theme.accent, theme.text, theme.textMuted]
  );

  const viewerModalTheme = useMemo(
    () => ({
      accent: theme.accent,
      danger: theme.danger,
    }),
    [theme.accent, theme.danger]
  );

  const hasRelations = useMemo(() => {
    return Boolean(Array.isArray(relations) && relations.length > 0);
  }, [relations]);

  const formatDate = useCallback((dateString: string | undefined | null): string | null => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const getImageUri = useCallback((filePath: string): string => {
    if (!filePath) return "";
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      return filePath;
    }
    const currentBaseUrl = getApiBaseUrl();
    const baseUrl = currentBaseUrl.endsWith("/") ? currentBaseUrl.slice(0, -1) : currentBaseUrl;
    const path = filePath.startsWith("/") ? filePath : `/${filePath}`;
    return `${baseUrl}${path}`;
  }, []);

  const renderImageItem = useCallback(
    (item: StockImageDto, globalIndex: number): React.ReactElement | null => {
      if (!item?.filePath) return null;
      const imageUri = getImageUri(item.filePath);

      return (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            openStockViewer(globalIndex);
          }}
          style={[
            styles.imageCard,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
            },
          ]}
        >
          {item.isPrimary ? (
            <View style={[styles.primaryBadge, { backgroundColor: `${theme.accent}E8` }]}>
              <Text style={styles.primaryBadgeText}>{t("stock.primaryBadge")}</Text>
            </View>
          ) : null}
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="cover"
            onError={() => {
              console.warn("Image load error:", imageUri);
            }}
          />
          <View style={styles.imageFooter}>
            <Text style={[styles.imageAlt, { color: theme.textMuted }]} numberOfLines={2}>
              {item.altText || t("stock.image")}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [getImageUri, openStockViewer, t, theme.accent, theme.cardBg, theme.cardBorder, theme.textMuted]
  );

  const renderRelation = useCallback(
    ({ item }: { item: StockRelationDto }) => {
      return (
        <View
          style={[
            styles.relationCard,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
            },
          ]}
        >
          <View style={styles.relationTop}>
            <View style={styles.relationTitleWrap}>
              <View
                style={[
                  styles.relationIconBox,
                  {
                    backgroundColor: `${theme.accent}10`,
                    borderColor: `${theme.accent}20`,
                  },
                ]}
              >
                <LinkSquare02Icon size={14} color={theme.accent} variant="stroke" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.relationName, { color: theme.text }]}>
                  {item.relatedStockName || t("stock.unknownStock")}
                </Text>
                {item.relatedStockCode ? (
                  <Text style={[styles.relationCode, { color: theme.textMuted }]}>
                    {t("stock.stockCode")}: {item.relatedStockCode}
                  </Text>
                ) : null}
              </View>
            </View>

            {item.isMandatory ? (
              <View
                style={[
                  styles.mandatoryBadge,
                  {
                    backgroundColor: `${theme.danger}10`,
                    borderColor: `${theme.danger}20`,
                  },
                ]}
              >
                <Text style={[styles.mandatoryText, { color: theme.danger }]}>
                  {t("stock.mandatory")}
                </Text>
              </View>
            ) : null}
          </View>

          <View
            style={[
              styles.relationMetricBox,
              {
                backgroundColor: theme.surfaceSoft,
                borderColor: theme.cardBorder,
              },
            ]}
          >
            <Text style={[styles.relationMetricLabel, { color: theme.textMuted }]}>
              {t("stock.quantity")}
            </Text>
            <Text style={[styles.relationMetricValue, { color: theme.text }]}>
              {String(item.quantity)}
            </Text>
          </View>

          {item.description ? (
            <View
              style={[
                styles.relationDescriptionBox,
                {
                  backgroundColor: theme.surfaceSoft,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <Note01Icon size={12} color={theme.textMuted} variant="stroke" />
              <Text style={[styles.relationDescription, { color: theme.textSoft }]}>
                {item.description}
              </Text>
            </View>
          ) : null}
        </View>
      );
    },
    [t, theme]
  );

  const renderDetailsTab = useCallback((): React.ReactElement => {
    return (
      <FlatListScrollView
        style={styles.tabContent}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
            },
          ]}
        >
          <View style={styles.heroTop}>
            <View
              style={[
                styles.heroIconWrap,
                {
                  backgroundColor: `${theme.accent}10`,
                  borderColor: `${theme.accent}20`,
                },
              ]}
            >
              <PackageIcon size={18} color={theme.accent} variant="stroke" />
            </View>

            <View style={styles.heroTextWrap}>
              <Text style={[styles.stockName, { color: theme.title }]} numberOfLines={2}>
                {stock?.stockName || "-"}
              </Text>
              {stock?.erpStockCode ? (
                <View style={styles.heroMetaRow}>
                  <Tag01Icon size={12} color={theme.textMuted} variant="stroke" />
                  <Text style={[styles.stockCode, { color: theme.textMuted }]}>
                    {stock.erpStockCode}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.heroChips}>
            <View
              style={[
                styles.heroChip,
                {
                  backgroundColor: theme.surfaceSoft,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <Store03Icon size={12} color={theme.textMuted} variant="stroke" />
              <Text style={[styles.heroChipText, { color: theme.text }]}>
                {stock?.unit || "Adet"}
              </Text>
            </View>

            <View
              style={[
                styles.heroChip,
                {
                  backgroundColor: theme.surfaceSoft,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <Layers01Icon size={12} color={theme.textMuted} variant="stroke" />
              <Text style={[styles.heroChipText, { color: theme.text }]}>
                {stock?.grupAdi || stock?.grupKodu || "-"}
              </Text>
            </View>

            {stock?.branchCode !== undefined ? (
              <View
                style={[
                  styles.heroChip,
                  {
                    backgroundColor: theme.surfaceSoft,
                    borderColor: theme.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.heroChipText, { color: theme.text }]}>
                  {t("stock.branchCode")}: {String(stock.branchCode)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
              shadowColor: isDark ? "#000" : "#E11D48",
            },
          ]}
        >
          <SectionHeader title={t("stock.basicInfo")} theme={theme} />
          <DetailRow
            label={t("stock.stockCode")}
            value={stock?.erpStockCode}
            theme={theme}
            icon={<Tag01Icon size={13} color={theme.textMuted} variant="stroke" />}
            emphasizeValue
          />
          <DetailRow
            label={t("stock.unit")}
            value={stock?.unit}
            theme={theme}
            icon={<PackageIcon size={13} color={theme.textMuted} variant="stroke" />}
          />
          <DetailRow
            label={t("stock.ureticiKodu")}
            value={stock?.ureticiKodu}
            theme={theme}
            icon={<Store03Icon size={13} color={theme.textMuted} variant="stroke" />}
          />
          <DetailRow
            label={t("stock.branchCode")}
            value={stock?.branchCode}
            theme={theme}
            icon={<Layers01Icon size={13} color={theme.textMuted} variant="stroke" />}
          />
          <DetailRow
            label={t("stock.grupKodu")}
            value={stock?.grupKodu}
            theme={theme}
            icon={<Layers01Icon size={13} color={theme.textMuted} variant="stroke" />}
          />
          <DetailRow
            label={t("stock.grupAdi")}
            value={stock?.grupAdi}
            theme={theme}
            icon={<Layers01Icon size={13} color={theme.textMuted} variant="stroke" />}
            isLast
          />
        </View>

        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
              shadowColor: isDark ? "#000" : "#E11D48",
            },
          ]}
        >
          <SectionHeader title={t("stock.codeInfo")} theme={theme} />
          <DetailRow label={t("stock.kod1")} value={stock?.kod1} theme={theme} />
          <DetailRow label={t("stock.kod1Adi")} value={stock?.kod1Adi} theme={theme} />
          <DetailRow label={t("stock.kod2")} value={stock?.kod2} theme={theme} />
          <DetailRow label={t("stock.kod2Adi")} value={stock?.kod2Adi} theme={theme} />
          <DetailRow label={t("stock.kod3")} value={stock?.kod3} theme={theme} />
          <DetailRow label={t("stock.kod3Adi")} value={stock?.kod3Adi} theme={theme} />
          <DetailRow label={t("stock.kod4")} value={stock?.kod4} theme={theme} />
          <DetailRow label={t("stock.kod4Adi")} value={stock?.kod4Adi} theme={theme} />
          <DetailRow label={t("stock.kod5")} value={stock?.kod5} theme={theme} />
          <DetailRow label={t("stock.kod5Adi")} value={stock?.kod5Adi} theme={theme} isLast />
        </View>

        {stock?.stockDetail ? (
          <View
            style={[
              styles.section,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
                shadowColor: isDark ? "#000" : "#E11D48",
              },
            ]}
          >
            <SectionHeader title={t("stock.stockDetail")} theme={theme} />

            {stock.stockDetail.htmlDescription ? (
              <View
                style={[
                  styles.noteBox,
                  {
                    backgroundColor: theme.surfaceSoft,
                    borderColor: theme.cardBorder,
                  },
                ]}
              >
                <Note01Icon size={13} color={theme.warning} variant="stroke" />
                <Text style={[styles.noteText, { color: theme.textSoft }]}>
                  {stock.stockDetail.htmlDescription.replace(/<[^>]*>/g, "")}
                </Text>
              </View>
            ) : null}

            {stock.stockDetail.technicalSpecsJson ? (
              <View
                style={[
                  styles.techBox,
                  {
                    backgroundColor: theme.surfaceSoft,
                    borderColor: theme.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.techTitle, { color: theme.textMuted }]}>
                  {t("stock.technicalSpecs")}
                </Text>
                <Text style={[styles.techText, { color: theme.textSoft }]}>
                  {stock.stockDetail.technicalSpecsJson}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
              shadowColor: isDark ? "#000" : "#E11D48",
            },
          ]}
        >
          <SectionHeader title={t("stock.systemInfo")} theme={theme} />
          <DetailRow
            label={t("stock.createdBy")}
            value={stock?.createdByFullUser}
            theme={theme}
            icon={<Calendar03Icon size={13} color={theme.textMuted} variant="stroke" />}
          />
          <DetailRow
            label={t("stock.createdDate")}
            value={formatDate(stock?.createdDate)}
            theme={theme}
          />
          <DetailRow
            label={t("stock.updatedBy")}
            value={stock?.updatedByFullUser}
            theme={theme}
            icon={<Calendar03Icon size={13} color={theme.textMuted} variant="stroke" />}
          />
          <DetailRow
            label={t("stock.updatedDate")}
            value={formatDate(stock?.updatedDate)}
            theme={theme}
          />
          <DetailRow
            label={t("stock.deletedBy")}
            value={stock?.deletedByFullUser}
            theme={theme}
            icon={<Calendar03Icon size={13} color={theme.textMuted} variant="stroke" />}
          />
          <DetailRow
            label={t("stock.deletedDate")}
            value={formatDate(stock?.deletedDate)}
            theme={theme}
          />

          {stock?.isDeleted !== undefined ? (
            <View
              style={[
                styles.detailRowCard,
                {
                  backgroundColor: theme.rowBg,
                  borderColor: theme.rowBorder,
                  marginBottom: 0,
                },
              ]}
            >
              <View style={styles.detailRowInner}>
                <View
                  style={[
                    styles.detailLabelBox,
                    {
                      backgroundColor: theme.labelBg,
                      borderColor: theme.labelBorder,
                    },
                  ]}
                >
                  <View style={styles.detailIconWrap}>
                    {stock.isDeleted ? (
                      <CancelCircleIcon size={13} color={theme.danger} variant="stroke" />
                    ) : (
                      <CheckmarkCircle02Icon size={13} color={theme.success} variant="stroke" />
                    )}
                  </View>
                  <Text style={[styles.detailLabel, { color: theme.textMuted }]}>
                    {t("stock.isDeleted")}
                  </Text>
                </View>

                <View style={styles.detailValueWrap}>
                  <Text
                    style={[
                      styles.detailValue,
                      { color: stock.isDeleted ? theme.danger : theme.success },
                    ]}
                  >
                    {stock.isDeleted ? t("common.yes") : t("common.no")}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </FlatListScrollView>
    );
  }, [stock, insets, t, formatDate, theme, isDark]);

  const renderImagesTab = useCallback((): React.ReactElement => {
    const uploadBusy = imageUpload ? imageUpload.isUploading || imageUpload.isImageMutationPending : false;
    const panelBg = isDark ? "rgba(15,23,42,0.88)" : "#FFFFFF";
    const panelBorder = isDark ? "rgba(248,250,252,0.14)" : "rgba(219,39,119,0.22)";
    const addBtnBg = isDark ? "rgba(219,39,119,0.18)" : "rgba(219,39,119,0.1)";
    const addBtnBorder = isDark ? "rgba(244,114,182,0.45)" : `${theme.accent}55`;
    const addLabelColor = isDark ? "#F8FAFC" : "#0F172A";
    const addIconColor = theme.accent;

    const uploadBar =
      imageUpload && stock ? (
        <TouchableOpacity
          activeOpacity={0.78}
          disabled={uploadBusy}
          onPress={() => {
            void imageUpload.onOpenAddImage();
          }}
          style={[
            styles.imageUploadPrimaryBtn,
            {
              backgroundColor: addBtnBg,
              borderColor: addBtnBorder,
              opacity: uploadBusy ? 0.55 : 1,
            },
          ]}
        >
          <View style={styles.imageUploadPrimaryInner}>
            {imageUpload.isUploading ? (
              <ActivityIndicator size="small" color={addIconColor} />
            ) : (
              <Add01Icon size={20} color={addIconColor} variant="stroke" />
            )}
            <Image01Icon size={18} color={addIconColor} variant="stroke" />
            <Text style={[styles.imageUploadPrimaryLabel, { color: addLabelColor }]} numberOfLines={1}>
              {t("stock.addImage")}
            </Text>
          </View>
        </TouchableOpacity>
      ) : null;

    const images = stockImages.filter((img) => !!img?.filePath);

    if (images.length === 0) {
      return (
        <FlatListScrollView
          style={styles.tabContent}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 110 }]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.imagesTabPanel,
              {
                backgroundColor: panelBg,
                borderColor: panelBorder,
              },
            ]}
          >
            {uploadBar}
          </View>
          <View style={styles.emptyContainer}>
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.emptyIconWrap,
                  {
                    backgroundColor: `${theme.accent}10`,
                    borderColor: `${theme.accent}20`,
                  },
                ]}
              >
                <Image02Icon size={18} color={theme.accent} variant="stroke" />
              </View>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t("stock.noImages")}</Text>
            </View>
          </View>
        </FlatListScrollView>
      );
    }

    const rows: StockImageDto[][] = [];
    for (let i = 0; i < images.length; i += 2) {
      rows.push(images.slice(i, i + 2));
    }

    return (
      <FlatListScrollView
        style={styles.tabContent}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.imagesTabPanel,
            {
              backgroundColor: panelBg,
              borderColor: panelBorder,
            },
          ]}
        >
          {uploadBar}
        </View>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.imageRow}>
            {row.map((item, colIdx) => {
              const globalIndex = rowIndex * 2 + colIdx;
              return (
                <React.Fragment key={item.id}>{renderImageItem(item, globalIndex)}</React.Fragment>
              );
            })}
            {row.length === 1 ? <View style={styles.imageCardGhost} /> : null}
          </View>
        ))}
      </FlatListScrollView>
    );
  }, [imageUpload, insets.bottom, isDark, renderImageItem, stock, stockImages, t, theme]);

  const renderRelationsTab = useCallback((): React.ReactElement => {
    if (!hasRelations) {
      return (
        <View style={styles.emptyContainer}>
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
              },
            ]}
          >
            <View
              style={[
                styles.emptyIconWrap,
                {
                  backgroundColor: `${theme.accent}10`,
                  borderColor: `${theme.accent}20`,
                },
              ]}
            >
              <LinkSquare02Icon size={18} color={theme.accent} variant="stroke" />
            </View>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              {t("stock.noRelations")}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <FlatListScrollView
        style={styles.tabContent}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        <FlatList
          data={relations}
          renderItem={renderRelation}
          keyExtractor={(item) => String(item.id)}
          scrollEnabled={false}
        />
      </FlatListScrollView>
    );
  }, [hasRelations, relations, insets.bottom, renderRelation, t, theme]);

  const renderTabContent = useCallback((): React.ReactElement => {
    switch (activeTab) {
      case "images":
        return renderImagesTab();
      case "relations":
        return renderRelationsTab();
      default:
        return renderDetailsTab();
    }
  }, [activeTab, renderDetailsTab, renderImagesTab, renderRelationsTab]);

  const tabs = [
    { key: "details" as const, label: t("stock.tabDetails"), icon: PackageIcon },
    { key: "images" as const, label: t("stock.tabImages"), icon: Image02Icon },
    { key: "relations" as const, label: t("stock.tabRelations"), icon: LinkSquare02Icon },
  ];

  return (
    <>
      <View style={styles.container}>
        <View
          style={[
            styles.tabShell,
            {
              backgroundColor: theme.cardBg,
              borderBottomColor: theme.cardBorder,
            },
          ]}
        >
        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;

            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  isActive && [
                    styles.activeTab,
                    {
                      backgroundColor: `${theme.accent}12`,
                      borderColor: `${theme.accent}24`,
                    },
                  ],
                ]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.78}
              >
                <View
                  style={[
                    styles.tabIconWrap,
                    isActive && {
                      backgroundColor: `${theme.accent}10`,
                      borderColor: `${theme.accent}18`,
                    },
                  ]}
                >
                  <Icon
                    size={14}
                    color={isActive ? theme.accent : theme.textMuted}
                    variant="stroke"
                  />
                </View>
                <Text
                  style={[
                    styles.tabText,
                    { color: isActive ? theme.text : theme.textMuted },
                    isActive && styles.activeTabText,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

        {renderTabContent()}
      </View>

      {imageUpload ? (
        <StockImageUploadPreviewModal
          visible={Boolean(imageUpload.pendingUploadUri)}
          uri={imageUpload.pendingUploadUri ?? ""}
          isUploading={imageUpload.isUploading}
          onClose={imageUpload.onClearPendingUpload}
          onConfirm={imageUpload.onConfirmPendingUpload}
          t={t}
          theme={previewModalTheme}
        />
      ) : null}

      {imageUpload ? (
        <StockImageViewerModal
          visible={viewerOpen && stockImages.length > 0}
          images={stockImages.filter((img) => !!img?.filePath)}
          initialIndex={viewerIndex}
          onClose={() => {
            setViewerOpen(false);
          }}
          getImageUri={getImageUri}
          onRequestDelete={imageUpload.requestDeleteImage}
          onSetPrimary={imageUpload.setPrimaryImage}
          isMutationPending={imageUpload.isImageMutationPending}
          isDark={isDark}
          t={t}
          theme={viewerModalTheme}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  tabShell: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },

  tabBar: {
    flexDirection: "row",
    gap: 10,
  },

  tab: {
    flex: 1,
    minHeight: 54,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
    gap: 6,
  },

  activeTab: {
    borderRadius: 16,
  },

  tabIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },

  tabText: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },

  activeTabText: {
    fontWeight: "700",
  },

  tabContent: {
    flex: 1,
  },

  contentContainer: {
    padding: 16,
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 16,
  },

  emptyCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 28,
  },

  emptyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  emptyText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },

  heroCard: {
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 16,
  },

  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },

  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  heroTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  stockName: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
    marginBottom: 6,
  },

  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  stockCode: {
    fontSize: 13,
    fontWeight: "500",
  },

  heroChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  heroChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  heroChipText: {
    fontSize: 11,
    fontWeight: "600",
  },

  section: {
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 1,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
  },

  sectionAccentBar: {
    width: 4,
    height: 18,
    borderRadius: 999,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  detailRowCard: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },

  detailRowInner: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "stretch",
  },

  detailLabelBox: {
    width: "47%",
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRightWidth: 1,
  },

  detailValueWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  detailIconWrap: {
    marginRight: 8,
    opacity: 0.95,
  },

  detailLabel: {
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
  },

  detailValue: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
    lineHeight: 18,
  },

  noteBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },

  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },

  techBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
  },

  techTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },

  techText: {
    fontSize: 13,
    lineHeight: 19,
  },

  imagesTabPanel: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },

  imageUploadPrimaryBtn: {
    borderRadius: 16,
    borderWidth: 1.5,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  imageUploadPrimaryInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    justifyContent: "center",
  },

  imageUploadPrimaryLabel: {
    fontSize: 15,
    fontWeight: "800",
    flexShrink: 1,
    letterSpacing: -0.2,
  },

  primaryBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },

  primaryBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  imageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },

  imageCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },

  imageCardGhost: {
    flex: 1,
  },

  image: {
    width: "100%",
    aspectRatio: 1,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },

  imageFooter: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },

  imageAlt: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },

  relationCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
  },

  relationTop: {
    marginBottom: 12,
  },

  relationTitleWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  relationIconBox: {
    width: 32,
    height: 32,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  relationName: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
    lineHeight: 18,
  },

  relationCode: {
    fontSize: 12,
    fontWeight: "500",
  },

  mandatoryBadge: {
    alignSelf: "flex-start",
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 42,
  },

  mandatoryText: {
    fontSize: 10,
    fontWeight: "700",
  },

  relationMetricBox: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },

  relationMetricLabel: {
    fontSize: 11,
    marginBottom: 4,
    fontWeight: "500",
  },

  relationMetricValue: {
    fontSize: 15,
    fontWeight: "700",
  },

  relationDescriptionBox: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },

  relationDescription: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
});