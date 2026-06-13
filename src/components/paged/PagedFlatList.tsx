import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  type FlatListProps,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { FilterIcon } from "hugeicons-react-native";
import { useTranslation } from "react-i18next";
import { StockBrowseListSeparator, stockBrowseStyles } from "../shared/stock-browse";
import { useUIStore } from "../../store/ui";
import { Text } from "../ui/text";
import { PagedSearchInput } from "./PagedSearchInput";

interface BrowseListShellConfig {
  borderColor: string;
  backgroundColor: string;
  separatorColor: string;
}

interface PagedFlatListProps<ItemT>
  extends Omit<FlatListProps<ItemT>, "data" | "renderItem"> {
  data: readonly ItemT[];
  renderItem: FlatListProps<ItemT>["renderItem"];
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  onOpenFilters?: () => void;
  activeFilterCount?: number;
  toolbarActions?: React.ReactNode;
  topRightActions?: React.ReactNode;
  bottomRightActions?: React.ReactNode;
  metaContent?: React.ReactNode;
  afterToolbarContent?: React.ReactNode;
  isLoading?: boolean;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  totalCount?: number;
  endOfListLabel?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  emptyComponent?: React.ReactNode;
  listKey?: string;
  browseListShell?: BrowseListShellConfig;
}

export function PagedFlatList<ItemT>({
  data,
  renderItem,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  onOpenFilters,
  activeFilterCount = 0,
  toolbarActions,
  topRightActions,
  bottomRightActions,
  metaContent,
  afterToolbarContent,
  isLoading = false,
  isFetchingNextPage = false,
  hasNextPage,
  totalCount,
  endOfListLabel,
  refreshing = false,
  onRefresh,
  emptyComponent,
  listKey,
  browseListShell,
  ListFooterComponent,
  contentContainerStyle,
  ItemSeparatorComponent,
  ...flatListProps
}: PagedFlatListProps<ItemT>): React.ReactElement {
  const { t } = useTranslation();
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  const theme = {
    textMuted: isDark ? "#94A3B8" : "#64748B",
    softBg: isDark ? "rgba(255,255,255,0.045)" : "#F8FAFC",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.18)",
    accent: "#db2777",
  };

  const renderBrowseSeparator = useCallback(
    () => (
      <StockBrowseListSeparator color={browseListShell?.separatorColor ?? theme.border} />
    ),
    [browseListShell?.separatorColor, theme.border]
  );

  const resolvedTopRightActions = topRightActions ?? toolbarActions;

  const footerNode =
    typeof ListFooterComponent === "function"
      ? <ListFooterComponent />
      : ListFooterComponent;

  const emptyNode =
    typeof emptyComponent === "function"
      ? React.createElement(emptyComponent as React.ComponentType)
      : emptyComponent;

  const showEndOfList =
    !isFetchingNextPage &&
    hasNextPage === false &&
    data.length > 0;

  const endLabel =
    endOfListLabel ??
    t("common.endOfList", "Tüm kayıtlar yüklendi");

  const combinedFooter = (
    <>
      {footerNode}
      {isFetchingNextPage ? (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={theme.accent} />
          <Text style={[styles.footerLoaderText, { color: theme.textMuted }]}>
            {t("common.loadingMore", "Daha fazla yükleniyor…")}
          </Text>
        </View>
      ) : showEndOfList ? (
        <View style={styles.footerEnd}>
          <View style={[styles.footerEndDivider, { backgroundColor: theme.border }]} />
          <Text style={[styles.footerEndText, { color: theme.textMuted }]}>
            {totalCount != null && totalCount > 0
              ? `${endLabel} • ${data.length} / ${totalCount}`
              : endLabel}
          </Text>
        </View>
      ) : null}
    </>
  );

  return (
    <View style={styles.container}>
      {/* 1. SATIR: SEARCH + GRID/LIST */}
      <View style={styles.toolbarTopRow}>
        <View style={styles.searchWrap}>
          <PagedSearchInput
            value={searchValue}
            onChangeText={onSearchChange}
            placeholder={searchPlaceholder}
          />
        </View>

        {resolvedTopRightActions ? (
          <View style={styles.topRightActions}>{resolvedTopRightActions}</View>
        ) : null}
      </View>

      {/* 2. SATIR: META (sol) + FİLTRE + SORT */}
      {onOpenFilters || bottomRightActions || metaContent ? (
        <View style={styles.toolbarBottomRow}>
          <View style={styles.toolbarBottomMetaSlot}>{metaContent ?? null}</View>
          {onOpenFilters || bottomRightActions ? (
            <View style={styles.bottomRowRight}>
              {onOpenFilters ? (
                <TouchableOpacity
                  style={styles.filterInlineBtn}
                  onPress={onOpenFilters}
                  activeOpacity={0.72}
                >
                  <FilterIcon
                    size={14}
                    color={activeFilterCount > 0 ? theme.accent : theme.textMuted}
                    strokeWidth={1.9}
                  />
                  <Text
                    style={[
                      styles.filterInlineText,
                      { color: activeFilterCount > 0 ? theme.accent : theme.textMuted },
                    ]}
                  >
                    {t("common.filter", "Filtrele")}
                  </Text>
                  {activeFilterCount > 0 ? (
                    <Text style={[styles.filterInlineCount, { color: theme.accent }]}>
                      {activeFilterCount}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ) : null}

              {bottomRightActions ? (
                <View style={styles.bottomRightActions}>{bottomRightActions}</View>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {afterToolbarContent ? <View style={styles.afterToolbar}>{afterToolbarContent}</View> : null}

      {isLoading && data.length === 0 ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : browseListShell ? (
        <View style={styles.browseListShellOuter}>
          <View
            style={[
              stockBrowseStyles.stockListShell,
              {
                borderColor: browseListShell.borderColor,
                backgroundColor: browseListShell.backgroundColor,
              },
            ]}
          >
            <FlatList
              key={listKey}
              data={data as ItemT[]}
              renderItem={renderItem}
              refreshing={refreshing}
              onRefresh={onRefresh}
              ListEmptyComponent={emptyNode as React.ReactElement | null | undefined}
              ListFooterComponent={combinedFooter}
              contentContainerStyle={[stockBrowseStyles.listContentInset, contentContainerStyle]}
              ItemSeparatorComponent={ItemSeparatorComponent ?? renderBrowseSeparator}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              removeClippedSubviews={Platform.OS === "android"}
              initialNumToRender={6}
              maxToRenderPerBatch={6}
              updateCellsBatchingPeriod={60}
              windowSize={7}
              {...flatListProps}
            />
          </View>
        </View>
      ) : (
        <FlatList
          key={listKey}
          data={data as ItemT[]}
          renderItem={renderItem}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={emptyNode as React.ReactElement | null | undefined}
          ListFooterComponent={combinedFooter}
          contentContainerStyle={contentContainerStyle}
          ItemSeparatorComponent={ItemSeparatorComponent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          removeClippedSubviews={Platform.OS === "android"}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          updateCellsBatchingPeriod={60}
          windowSize={7}
          {...flatListProps}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  toolbarTopRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },

  toolbarBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },

  toolbarBottomMetaSlot: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
    justifyContent: "center",
  },

  searchWrap: {
    flex: 1,
  },

  topRightActions: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    marginLeft: 10,
    gap: 8,
  },

  bottomRowRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexShrink: 0,
  },

bottomRightActions: {
  flexDirection: "row",
  alignItems: "center",
  marginLeft: 14,
},

  afterToolbar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },

  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },

  browseListShellOuter: {
    flex: 1,
    paddingHorizontal: 16,
  },

  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 12,
    fontWeight: "500",
  },
  footerEnd: {
    paddingTop: 18,
    paddingBottom: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  footerEndDivider: {
    width: 56,
    height: 1,
    borderRadius: 1,
  },
  footerEndText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  filterInlineBtn: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 2,
  paddingVertical: 2,
},

filterInlineText: {
  fontSize: 12,
  fontWeight: "500",
  marginLeft: 6,
  letterSpacing: 0.1,
},

filterInlineCount: {
  fontSize: 11,
  fontWeight: "600",
  marginLeft: 5,
},
});