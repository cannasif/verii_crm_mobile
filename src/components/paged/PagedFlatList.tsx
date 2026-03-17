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
      <View style={styles.toolbar}>
        <View style={styles.searchWrap}>
          <PagedSearchInput
            value={searchValue}
            onChangeText={onSearchChange}
            placeholder={searchPlaceholder}
          />
        </View>

        {onOpenFilters ? (
          <TouchableOpacity
            style={[
              styles.filterButton,
              {
                backgroundColor: theme.softBg,
                borderColor: activeFilterCount > 0 ? theme.accent : theme.border,
              },
            ]}
            onPress={onOpenFilters}
            activeOpacity={0.72}
          >
            <FilterIcon
              size={18}
              color={activeFilterCount > 0 ? theme.accent : theme.textMuted}
              strokeWidth={2.1}
            />
            <Text
              style={[
                styles.filterButtonText,
                { color: activeFilterCount > 0 ? theme.accent : theme.textMuted },
              ]}
            >
              {t("common.filter")}
            </Text>
            {activeFilterCount > 0 ? (
              <View style={[styles.filterBadge, { backgroundColor: theme.accent }]}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ) : null}

        {toolbarActions ? <View style={styles.toolbarActions}>{toolbarActions}</View> : null}
      </View>

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
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  searchWrap: {
    flex: 1,
  },
  filterButton: {
    marginLeft: 10,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  toolbarActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
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
});
