import React, { useCallback, useState, useMemo, useEffect } from "react";
import {
  View,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import {
  PagedAdvancedFilterBuilder,
  PagedAdvancedFilterModal,
  mapPagedAdvancedFilterRowsToFilters,
  type PagedAdvancedFilterFieldConfig,
  type PagedAdvancedFilterRow,
} from "../../../components/paged";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useCustomers } from "../hooks";
import type { CustomerGetDto } from "../types";
// YENİ İKONLAR (Stroke Varyantı)
import { 
  Search01Icon, 
  Cancel01Icon, 
  Call02Icon, 
  Mail01Icon, 
  Location01Icon, 
  ArrowRight01Icon,
  Add01Icon 
} from "hugeicons-react-native";

export interface CustomerSelectionResult {
  customerId: number;
  erpCustomerCode?: string;
  customerName: string;
}

type CustomerType = "erp" | "potential";

interface CustomerWithType extends CustomerGetDto {
  type: CustomerType;
}

function getCustomerType(c: CustomerGetDto): CustomerType {
  const isIntegrated = c.isERPIntegrated === true;
  const hasCode =
    c.customerCode != null && String(c.customerCode).trim() !== "";
  return isIntegrated || hasCode ? "erp" : "potential";
}

interface CustomerSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (result: CustomerSelectionResult) => void;
  showNewCustomerButton?: boolean;
  onNewCustomer?: () => void;
  contextUserId?: number;
}

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 700;
const BADGE_ERP = "#8B5CF6";      // Mor (ERP)
const BADGE_POTENTIAL = "#db2777"; // Pembe (Potansiyel) - Temaya uyduruldu

export function CustomerSelectDialog({
  open,
  onOpenChange,
  onSelect,
  showNewCustomerButton = false,
  onNewCustomer,
  contextUserId,
}: CustomerSelectDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const { colors, themeMode } = useUIStore();
  const insets = useSafeAreaInsets();

  const isDark = themeMode === "dark";

  // --- TEMA ---
  const THEME = {
    bg: isDark ? "#1a0b2e" : colors.background,
    cardBg: isDark ? "#1e1b29" : colors.card,
    text: isDark ? "#FFFFFF" : colors.text,
    textMute: isDark ? "#94a3b8" : colors.textMuted,
    border: isDark ? "rgba(255,255,255,0.1)" : colors.border,
    inputBg: isDark ? "rgba(255,255,255,0.05)" : colors.backgroundSecondary,
    primary: "#db2777",
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"erp" | "potential" | "all">("all");
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [draftFilterRows, setDraftFilterRows] = useState<PagedAdvancedFilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<PagedAdvancedFilterRow[]>([]);
  const [tempFilterLogic, setTempFilterLogic] = useState<"and" | "or">("and");
  const [appliedFilterLogic, setAppliedFilterLogic] = useState<"and" | "or">("and");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const apiFilters = useMemo(() => {
    const filters: Array<{ column: string; operator: string; value: string }> = [];

    if (activeTab === "erp") {
      filters.push({ column: "isERPIntegrated", operator: "eq", value: "true" });
    } else if (activeTab === "potential") {
      filters.push({ column: "isERPIntegrated", operator: "eq", value: "false" });
    }

    filters.push(...mapPagedAdvancedFilterRowsToFilters(appliedFilterRows));

    return filters;
  }, [activeTab, appliedFilterRows]);

  const customerFilterFields = useMemo<PagedAdvancedFilterFieldConfig[]>(
    () => [
      {
        value: "customerCode",
        label: t("customer.customerCode"),
        type: "text",
        placeholder: t("customer.customerCode"),
      },
      {
        value: "name",
        label: t("customer.name"),
        type: "text",
        placeholder: t("customer.name"),
      },
      {
        value: "phone",
        label: t("customer.phone"),
        type: "text",
        placeholder: t("customer.phone"),
      },
      {
        value: "email",
        label: t("customer.email"),
        type: "text",
        placeholder: t("customer.email"),
      },
      {
        value: "cityName",
        label: t("customer.modal.citySelection"),
        type: "text",
        placeholder: t("customer.modal.citySelection"),
      },
      {
        value: "customerTypeName",
        label: t("customer.customerType"),
        type: "text",
        placeholder: t("customer.customerType"),
      },
    ],
    [t]
  );

  const {
    data: pagesData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCustomers({
    pageSize: PAGE_SIZE,
    enabled: open,
    search: debouncedSearchQuery || undefined,
    sortBy: "Id",
    sortDirection: "asc",
    filters: apiFilters,
    filterLogic: appliedFilterLogic,
    contextUserId,
  });

  const allItems = useMemo(
    () => pagesData?.pages.flatMap((p) => p.items) ?? [],
    [pagesData]
  );

  const itemsWithType = useMemo((): CustomerWithType[] => {
    return allItems.map((c) => ({ ...c, type: getCustomerType(c) }));
  }, [allItems]);

  const filteredItems = useMemo((): CustomerWithType[] => itemsWithType, [itemsWithType]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setDebouncedSearchQuery("");
      setActiveTab("all");
      setIsFilterModalVisible(false);
      setDraftFilterRows([]);
      setAppliedFilterRows([]);
      setTempFilterLogic("and");
      setAppliedFilterLogic("and");
    }
  }, [open]);

  const handleSelect = useCallback(
    (item: CustomerWithType) => {
      onSelect({
        customerId: item.id,
        erpCustomerCode:
          item.type === "erp" && item.customerCode
            ? item.customerCode
            : undefined,
        customerName: item.name,
      });
      onOpenChange(false);
    },
    [onSelect, onOpenChange]
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const emptyMessage = useMemo((): string => {
    if (debouncedSearchQuery || apiFilters.length > 0) return t("common.noResults");
    if (activeTab === "erp") return t("customer.selectEmptyErp");
    if (activeTab === "potential") return t("customer.selectEmptyPotential");
    return t("customer.selectEmptyAll");
  }, [debouncedSearchQuery, apiFilters.length, activeTab, t]);

  const handleApplyFilters = useCallback(() => {
    setAppliedFilterRows(draftFilterRows);
    setAppliedFilterLogic(tempFilterLogic);
    setIsFilterModalVisible(false);
  }, [draftFilterRows, tempFilterLogic]);

  const handleClearFilters = useCallback(() => {
    setDraftFilterRows([]);
    setAppliedFilterRows([]);
    setTempFilterLogic("and");
    setAppliedFilterLogic("and");
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: CustomerWithType }) => (
      <CustomerSelectRow
        item={item}
        onPress={() => handleSelect(item)}
        theme={THEME}
        t={t}
      />
    ),
    [handleSelect, THEME, t]
  );

  const renderEmpty = useCallback((): React.ReactElement | null => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: THEME.textMute }]}>
          {emptyMessage}
        </Text>
      </View>
    );
  }, [isLoading, emptyMessage, THEME]);

  const keyExtractor = useCallback((item: CustomerWithType) => String(item.id), []);

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={handleClose} />
        <View
          style={[
            styles.modalContent,
            { backgroundColor: THEME.cardBg, paddingBottom: insets.bottom + 16 },
          ]}
        >
          {/* HEADER */}
          <View style={[styles.modalHeader, { borderBottomColor: THEME.border }]}>
            <View style={[styles.handle, { backgroundColor: THEME.border }]} />
            <View style={styles.headerContent}>
              <Text style={[styles.modalTitle, { color: THEME.text }]}>
                {t("customer.selectCustomer")}
              </Text>
              <Text style={[styles.modalDescription, { color: THEME.textMute }]}>
                {t("customer.searchPlaceholder")}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Cancel01Icon size={24} color={THEME.text} variant="stroke" />
            </TouchableOpacity>
          </View>

          {/* ARAMA */}
          <View style={styles.searchRow}>
            <View style={[styles.searchContainer, { backgroundColor: THEME.inputBg }]}>
              <Search01Icon size={18} color={THEME.textMute} variant="stroke" />
              <TextInput
                style={[styles.searchInput, { color: THEME.text }]}
                placeholder={t("customer.searchPlaceholder")}
                placeholderTextColor={THEME.textMute}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>
            <TouchableOpacity
              style={[styles.filterButton, { borderColor: THEME.border, backgroundColor: THEME.inputBg }]}
              onPress={() => setIsFilterModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterButtonText, { color: THEME.text }]}>
                {t("common.filter")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* TABS */}
          <View style={[styles.tabRow, { borderBottomColor: THEME.border }]}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "erp" && [
                  styles.tabActive,
                  { backgroundColor: BADGE_ERP + "20", borderColor: BADGE_ERP, borderWidth: 1 },
                ],
              ]}
              onPress={() => setActiveTab("erp")}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: activeTab === "erp" ? BADGE_ERP : THEME.textMute,
                    fontWeight: activeTab === "erp" ? "700" : "500"
                  },
                ]}
              >
                {t("customer.selectTabErp")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "potential" && [
                  styles.tabActive,
                  { backgroundColor: BADGE_POTENTIAL + "20", borderColor: BADGE_POTENTIAL, borderWidth: 1 },
                ],
              ]}
              onPress={() => setActiveTab("potential")}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: activeTab === "potential" ? BADGE_POTENTIAL : THEME.textMute,
                    fontWeight: activeTab === "potential" ? "700" : "500"
                  },
                ]}
              >
                {t("customer.selectTabPotential")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "all" && [
                  styles.tabActive,
                  { backgroundColor: THEME.primary + "20", borderColor: THEME.primary, borderWidth: 1 },
                ],
              ]}
              onPress={() => setActiveTab("all")}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: activeTab === "all" ? THEME.primary : THEME.textMute,
                    fontWeight: activeTab === "all" ? "700" : "500"
                  },
                ]}
              >
                {t("customer.selectTabAll")}
              </Text>
            </TouchableOpacity>

            {showNewCustomerButton && onNewCustomer ? (
              <TouchableOpacity
                style={[styles.newCustomerButton, { backgroundColor: THEME.primary }]}
                onPress={onNewCustomer}
              >
                <Add01Icon size={16} color="#FFFFFF" variant="stroke" style={{marginRight: 4}} />
                <Text style={styles.newCustomerButtonText}>
                  {t("customer.create")}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* LISTE */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={THEME.primary} />
              <Text style={[styles.loadingText, { color: THEME.textMute }]}>
                {t("common.loading")}
              </Text>
            </View>
          ) : filteredItems.length === 0 ? (
            renderEmpty()
          ) : (
            <FlatList
              data={filteredItems}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={renderEmpty}
              onEndReached={handleEndReached}
              onEndReachedThreshold={0.4}
              ListFooterComponent={
                isFetchingNextPage ? (
                  <View style={styles.footerLoading}>
                    <ActivityIndicator size="small" color={THEME.primary} />
                  </View>
                ) : null
              }
            />
          )}
        </View>
      </View>

      <PagedAdvancedFilterModal
        visible={isFilterModalVisible}
        title={t("customer.modal.title")}
        filterLogic={tempFilterLogic}
        onFilterLogicChange={setTempFilterLogic}
        onClose={() => setIsFilterModalVisible(false)}
        onClear={handleClearFilters}
        onApply={handleApplyFilters}
        bottomInset={insets.bottom + 20}
      >
        <PagedAdvancedFilterBuilder
          fields={customerFilterFields}
          rows={draftFilterRows}
          onRowsChange={setDraftFilterRows}
          defaultField="customerCode"
        />
      </PagedAdvancedFilterModal>
    </Modal>
  );
}

interface CustomerSelectRowProps {
  item: CustomerWithType;
  onPress: () => void;
  theme: any;
  t: (key: string) => string;
}

function CustomerSelectRow({
  item,
  onPress,
  theme,
  t,
}: CustomerSelectRowProps): React.ReactElement {
  const badgeColor = item.type === "erp" ? BADGE_ERP : BADGE_POTENTIAL;
  const badgeLabel =
    item.type === "erp"
      ? t("customer.selectBadgeErp")
      : t("customer.selectBadgePotential");
  const location = [item.cityName, item.districtName]
    .filter(Boolean)
    .join(", ");

  return (
    <TouchableOpacity
      style={[
        styles.row,
        {
          backgroundColor: theme.inputBg, // Kart arka planı
          borderColor: theme.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.rowHeader}>
        <View style={[styles.badge, { backgroundColor: badgeColor + "20", borderColor: badgeColor + "40", borderWidth: 1 }]}>
          <Text style={[styles.badgeText, { color: badgeColor }]}>
            {badgeLabel}
          </Text>
        </View>
        <ArrowRight01Icon size={20} color={theme.textMute} variant="stroke" />
      </View>
      
      <Text style={[styles.rowCode, { color: theme.textMute }]} numberOfLines={1}>
        {item.customerCode ?? "—"}
      </Text>
      <Text style={[styles.rowName, { color: theme.text }]} numberOfLines={2}>
        {item.name}
      </Text>
      
      <View style={styles.rowDetails}>
        {item.phone ? (
          <View style={styles.detailRow}>
            <Call02Icon size={14} color={theme.textMute} variant="stroke" />
            <Text
              style={[styles.detailText, { color: theme.textMute }]}
              numberOfLines={1}
            >
              {item.phone}
            </Text>
          </View>
        ) : null}
        
        {item.email ? (
          <View style={styles.detailRow}>
            <Mail01Icon size={14} color={theme.textMute} variant="stroke" />
            <Text
              style={[styles.detailText, { color: theme.textMute }]}
              numberOfLines={1}
            >
              {item.email}
            </Text>
          </View>
        ) : null}
        
        {location ? (
          <View style={styles.detailRow}>
            <Location01Icon size={14} color={theme.textMute} variant="stroke" />
            <Text
              style={[styles.detailText, { color: theme.textMute }]}
              numberOfLines={1}
            >
              {location}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    gap: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  handle: {
    position: "absolute",
    top: 8,
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
  },
  headerContent: {
    marginTop: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 20,
    padding: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flex: 1,
    borderRadius: 12,
    gap: 10,
  },
  filterButton: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  tabRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabActive: {
    // Active style handled inline
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
  },
  newCustomerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 'auto', // Sağa yasla
  },
  newCustomerButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  footerLoading: {
    paddingVertical: 16,
    alignItems: "center",
  },
  row: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  rowCode: {
    fontSize: 12,
    fontFamily: "monospace",
    marginBottom: 4,
  },
  rowName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  rowDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    flex: 1,
  },
  filterModalOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  filterModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  filterModalContent: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 10,
  },
  filterModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  filterInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
  },
  filterModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 8,
  },
  logicRow: {
    marginTop: 4,
    gap: 8,
  },
  logicLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  logicButtons: {
    flexDirection: "row",
    gap: 10,
  },
  logicButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  logicButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  filterActionButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterActionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  filterApplyButton: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterApplyButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
});
