import React from "react";
import {
  ActivityIndicator,
  FlatList,
  type FlatListProps,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { FilterIcon } from "hugeicons-react-native";
import { useTranslation } from "react-i18next";
import { useUIStore } from "../../store/ui";
import { Text } from "../ui/text";
import { PagedSearchInput } from "./PagedSearchInput";

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
  refreshing?: boolean;
  onRefresh?: () => void;
  emptyComponent?: React.ReactNode;
  listKey?: string;
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
  refreshing = false,
  onRefresh,
  emptyComponent,
  listKey,
  ListFooterComponent,
  contentContainerStyle,
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

  const resolvedTopRightActions = topRightActions ?? toolbarActions;

  const footerNode =
    typeof ListFooterComponent === "function"
      ? <ListFooterComponent />
      : ListFooterComponent;

  const emptyNode =
    typeof emptyComponent === "function"
      ? React.createElement(emptyComponent as React.ComponentType)
      : emptyComponent;

  const combinedFooter = (
    <>
      {footerNode}
      {isFetchingNextPage ? (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={theme.accent} />
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

      {/* 2. SATIR: FILTER + SORT */}
      {(onOpenFilters || bottomRightActions) ? (
        <View style={styles.toolbarBottomRow}>
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
        </View>
      ) : null}

      {afterToolbarContent ? <View style={styles.afterToolbar}>{afterToolbarContent}</View> : null}
      {metaContent ? <View style={styles.metaRow}>{metaContent}</View> : null}

      {isLoading && data.length === 0 ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={theme.accent} />
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
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
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
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },

  searchWrap: {
    flex: 1,
  },

  topRightActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },

  bottomRowRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
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

  metaRow: {
    paddingHorizontal: 18,
    paddingBottom: 10,
  },

  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },

  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
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