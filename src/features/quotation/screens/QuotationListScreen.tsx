import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Text,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  LayoutGridIcon,
  ListViewIcon,
  Invoice01Icon,
} from "hugeicons-react-native";
import { listContentBottomPadding } from "../../../constants/layout";
import { ScreenHeader } from "../../../components/navigation";
import {
  PagedFlatList,
  SalesListCompactSeparator,
  SalesDocumentCreateToolbarIcon,
  SalesDocumentCompactListRow,
  DocumentApprovalStatusFilterSheet,
} from "../../../components/paged";
import { useDocumentApprovalListFilters } from "../../../lib/documentApprovalFilter";
import {
  resolveSalesDocumentRowAmountText,
  resolveSalesDocumentRowCurrencyLabel,
} from "../../../lib/salesDocumentRowDisplay";
import { useKeyboardBottomInset } from "../../../hooks/useKeyboardBottomInset";
import { useUIStore } from "../../../store/ui";
import { PermissionDeniedState } from "../../access-control/components/PermissionDeniedState";
import { isForbiddenError } from "../../access-control/utils/isForbiddenError";
import { useQuotationList, useCreateRevisionOfQuotation, useQuotationListRowActions, usePaymentTypeNameMap } from "../hooks";
import { resolveQuotationPaymentTypeLabel } from "../utils/resolveQuotationPaymentTypeLabel";
import { QuotationRow } from "../components/QuotationRow";
import { QuotationRowActionsSheet } from "../components/QuotationRowActionsSheet";
import { CustomerMailComposerModal } from "../../integration";
import type { QuotationGetDto } from "../types";

const GAP = 16;
const PADDING = 16;

type QuotationListViewMode = "card" | "list";

export function QuotationListScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { themeMode } = useUIStore();
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardBottomInset();

  const isDark = themeMode === "dark";

  const mainBg = isDark ? "#09090F" : "#F8FAFC";
  const brandColor = isDark ? "#EC4899" : "#DB2777";
  const mutedColor = isDark ? "#94A3B8" : "#64748B";
  const surfaceBg = isDark ? "rgba(255,255,255,0.035)" : "#FFFFFF";
  const borderColor = isDark ? "rgba(236, 72, 153, 0.18)" : "rgba(219, 39, 119, 0.14)";
  const switchBg = isDark ? "rgba(255,255,255,0.035)" : "#F8FAFC";
  const softBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.14)";
  const activeSwitchBg = isDark ? "rgba(236, 72, 153, 0.12)" : "rgba(219, 39, 119, 0.08)";
  const iconColor = isDark ? "#64748B" : "#94A3B8";

  const listSeparatorColor = isDark ? "rgba(255,255,255,0.16)" : "rgba(148,163,184,0.34)";

  const [viewMode, setViewMode] = useState<QuotationListViewMode>("card");

  const gradientColors = (
    isDark
      ? ["rgba(236,72,153,0.08)", "transparent", "rgba(249,115,22,0.05)"]
      : ["rgba(255,235,240,0.55)", "#FFFFFF", "rgba(255,244,237,0.55)"]
  ) as [string, string, ...string[]];

  const [sortBy, setSortBy] = useState<string>("Id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationGetDto | null>(null);
  const [mailProvider, setMailProvider] = useState<"google" | "outlook" | null>(null);
  const [actionsQuotation, setActionsQuotation] = useState<QuotationGetDto | null>(null);
  const [isApprovalFilterOpen, setIsApprovalFilterOpen] = useState(false);

  const {
    approvalStatusFilter,
    setApprovalStatusFilter,
    isApprovalStatusFiltered,
  } = useDocumentApprovalListFilters();

  const {
    isPdfBusy,
    shareQuotationPdfViaWhatsApp,
    downloadQuotationDraftPdf,
  } = useQuotationListRowActions();

  const [searchText, setSearchText] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchText);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchText]);

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useQuotationList({
    search: debouncedQuery.trim().length >= 2 ? debouncedQuery.trim() : undefined,
    sortBy,
    sortDirection,
    approvalStatusFilter,
  });

  const createRevisionMutation = useCreateRevisionOfQuotation();
  const paymentTypeNameMap = usePaymentTypeNameMap();

  const handleRowClick = useCallback(
    (id: number) => {
      router.push(`/(tabs)/sales/quotations/${id}`);
    },
    [router]
  );

  const handleCreatePress = useCallback(() => {
    router.push("/(tabs)/sales/quotations/create");
  }, [router]);

  const handleOpenApprovalFilter = useCallback(() => {
    setIsApprovalFilterOpen(true);
  }, []);

  const handleCloseApprovalFilter = useCallback(() => {
    setIsApprovalFilterOpen(false);
  }, []);

  const handleGoogleMail = useCallback((quotation: QuotationGetDto) => {
    setActionsQuotation(null);
    setSelectedQuotation(quotation);
    setMailProvider("google");
  }, []);

  const handleOutlookMail = useCallback((quotation: QuotationGetDto) => {
    setActionsQuotation(null);
    setSelectedQuotation(quotation);
    setMailProvider("outlook");
  }, []);

  const handleCloseActionsSheet = useCallback(() => {
    if (isPdfBusy) return;
    setActionsQuotation(null);
  }, [isPdfBusy]);

  const handleMenuPress = useCallback((_e: unknown, quotation: QuotationGetDto) => {
    setActionsQuotation(quotation);
  }, []);

  const handleShareWhatsApp = useCallback(
    (quotation: QuotationGetDto) => {
      void shareQuotationPdfViaWhatsApp(quotation).then(() => {
        setActionsQuotation(null);
      });
    },
    [shareQuotationPdfViaWhatsApp]
  );

  const handleDownloadPdf = useCallback(
    (quotation: QuotationGetDto) => {
      void downloadQuotationDraftPdf(quotation).then(() => {
        setActionsQuotation(null);
      });
    },
    [downloadQuotationDraftPdf]
  );

  const handleReviseFromSheet = useCallback(
    (quotation: QuotationGetDto) => {
      setActionsQuotation(null);
      createRevisionMutation.mutate(quotation.id);
    },
    [createRevisionMutation]
  );

  const handleCloseMailModal = useCallback(() => {
    setMailProvider(null);
    setSelectedQuotation(null);
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const quotations = useMemo(() => {
    return (
      data?.pages
        .flatMap((page) => page.items ?? [])
        .filter((item): item is QuotationGetDto => item != null) || []
    );
  }, [data]);

  const totalCount = data?.pages?.[0]?.totalCount ?? 0;

  const handleToggleSort = useCallback(() => {
    setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"));
  }, []);

  const renderListSeparator = useCallback(
    () => <SalesListCompactSeparator color={listSeparatorColor} />,
    [listSeparatorColor]
  );

  // --- RENDER ITEMS ---
  const renderItem = useCallback(
    ({ item }: { item: QuotationGetDto }) => {
      const paymentTypeLabel = resolveQuotationPaymentTypeLabel(
        item,
        paymentTypeNameMap,
        t("common.noData")
      );

      if (viewMode === "list") {
        return (
          <SalesDocumentCompactListRow
            id={item.id}
            offerNo={item.offerNo}
            customerName={item.potentialCustomerName?.trim() || t("common.noData")}
            offerDate={item.offerDate}
            status={item.status}
            cancellationReason={item.cancellationReason}
            amountText={resolveSalesDocumentRowAmountText(item)}
            currencyLabel={resolveSalesDocumentRowCurrencyLabel(item)}
            statusModule="quotation"
            menuAccessibilityLabel={t("quotation.rowActions.menuTitle")}
            onPress={handleRowClick}
            onMenuPress={(e) => handleMenuPress(e, item)}
          />
        );
      }

      return (
        <QuotationRow
          quotation={item}
          paymentTypeLabel={paymentTypeLabel}
          onPress={handleRowClick}
          onMenuPress={handleMenuPress}
        />
      );
    },
    [viewMode, handleRowClick, handleMenuPress, paymentTypeNameMap, t]
  );

  const renderEmpty = useCallback(() => {
    if (isLoading || isFetching) return null;
    return (
      <View style={styles.center}>
        <Text style={{ color: mutedColor, fontSize: 15, fontWeight: "500" }}>
          {isApprovalStatusFiltered
            ? t("quotation.approvalStatusFilter.noResults")
            : t("quotation.noQuotations")}
        </Text>
      </View>
    );
  }, [isLoading, isFetching, isApprovalStatusFiltered, mutedColor, t]);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return <View style={{ height: 40 }} />;
    return (
      <View style={styles.footerLoading}>
        <ActivityIndicator size="small" color={brandColor} />
      </View>
    );
  }, [isFetchingNextPage, brandColor]);

  if (error) {
    if (isForbiddenError(error)) {
      return <PermissionDeniedState />;
    }

    return (
      <View style={[styles.container, { backgroundColor: mainBg }]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View style={StyleSheet.absoluteFill}>
          <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        </View>
        <ScreenHeader title={t("quotation.list")} showBackButton />
        <View style={styles.center}>
          <Text style={{ color: "#ef4444", marginBottom: 12, fontWeight: "500" }}>
            {t("common.error")}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: brandColor }]}
            onPress={() => refetch()}
          >
            <Text style={{ color: "#FFF", fontWeight: "600" }}>
              {t("common.retry")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: mainBg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
      </View>

      <ScreenHeader title={t("quotation.list")} showBackButton />

      <View style={styles.listContainer}>
        <PagedFlatList
          listKey={`quotation-list-${viewMode}-${approvalStatusFilter}-${debouncedQuery}`}
          data={quotations}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          searchValue={searchText}
          onSearchChange={setSearchText}
          searchPlaceholder={t("quotation.searchPlaceholder")}
          browseListShell={
            viewMode === "list"
              ? {
                  borderColor,
                  backgroundColor: surfaceBg,
                  separatorColor: listSeparatorColor,
                }
              : undefined
          }
          ItemSeparatorComponent={viewMode === "list" ? renderListSeparator : undefined}
          toolbarActions={
            <>
              <TouchableOpacity
                onPress={handleCreatePress}
                style={[
                  styles.iconBtn,
                  {
                    backgroundColor: surfaceBg,
                    borderColor,
                    marginRight: 8,
                  },
                ]}
                activeOpacity={0.72}
                accessibilityRole="button"
                accessibilityLabel={t("quotation.createNew")}
              >
                <SalesDocumentCreateToolbarIcon
                  color={brandColor}
                  badgeBorderColor={surfaceBg}
                  icon={
                    <Invoice01Icon
                      size={20}
                      color={brandColor}
                      variant="stroke"
                      strokeWidth={2.3}
                    />
                  }
                />
              </TouchableOpacity>

              <View
                style={[
                  styles.viewSwitcher,
                  {
                    backgroundColor: switchBg,
                    borderColor: softBorder,
                  },
                ]}
              >
                <TouchableWithoutFeedback onPress={() => setViewMode("card")}>
                  <View
                    style={[
                      styles.switchBtn,
                      viewMode === "card" && {
                        backgroundColor: activeSwitchBg,
                        borderColor,
                      },
                    ]}
                  >
                    <LayoutGridIcon
                      size={19}
                      color={viewMode === "card" ? brandColor : iconColor}
                      variant="stroke"
                      strokeWidth={viewMode === "card" ? 2.2 : 1.7}
                    />
                  </View>
                </TouchableWithoutFeedback>

                <TouchableWithoutFeedback onPress={() => setViewMode("list")}>
                  <View
                    style={[
                      styles.switchBtn,
                      viewMode === "list" && {
                        backgroundColor: activeSwitchBg,
                        borderColor,
                      },
                    ]}
                  >
                    <ListViewIcon
                      size={19}
                      color={viewMode === "list" ? brandColor : iconColor}
                      variant="stroke"
                      strokeWidth={viewMode === "list" ? 2.2 : 1.7}
                    />
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </>
          }
          onOpenFilters={handleOpenApprovalFilter}
          activeFilterCount={isApprovalStatusFiltered ? 1 : 0}
          metaContent={
            <Text style={[styles.metaText, { color: mutedColor }]} numberOfLines={1}>
              {t("quotation.foundCount", { count: totalCount })}
            </Text>
          }
          bottomRightActions={
            <TouchableOpacity
              style={styles.sortInlineBtn}
              onPress={handleToggleSort}
              activeOpacity={0.72}
              accessibilityRole="button"
              accessibilityLabel={t("common.sort", "Sıralama")}
            >
              {sortDirection === "desc" ? (
                <ArrowDown01Icon size={14} color={mutedColor} strokeWidth={2} />
              ) : (
                <ArrowUp01Icon size={14} color={mutedColor} strokeWidth={2} />
              )}
              <Text style={[styles.sortInlineText, { color: mutedColor }]}>
                {t("common.sort", "Sıralama")}
              </Text>
            </TouchableOpacity>
          }
          isLoading={Boolean(isLoading && !data)}
          refreshing={isRefetching}
          onRefresh={refetch}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
          totalCount={data?.pages[0]?.totalCount}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.8}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            viewMode === "list" ? styles.flatListContentCompact : styles.flatListContent,
            {
              paddingBottom: listContentBottomPadding(insets.bottom) + keyboardInset,
            },
          ]}
          emptyComponent={renderEmpty()}
        />
      </View>

      <CustomerMailComposerModal
        visible={mailProvider !== null}
        onClose={handleCloseMailModal}
        provider={mailProvider ?? "google"}
        moduleKey="quotation"
        recordId={selectedQuotation?.id ?? 0}
        customerId={selectedQuotation?.potentialCustomerId}
        contactId={selectedQuotation?.contactId}
        customerName={selectedQuotation?.potentialCustomerName}
      />

      <DocumentApprovalStatusFilterSheet
        visible={isApprovalFilterOpen}
        module="quotation"
        selectedValue={approvalStatusFilter}
        onClose={handleCloseApprovalFilter}
        onSelect={setApprovalStatusFilter}
      />

      <QuotationRowActionsSheet
        visible={actionsQuotation !== null}
        quotation={actionsQuotation}
        isBusy={isPdfBusy}
        canRevise={
          actionsQuotation?.status === 0 || actionsQuotation?.status === 3
        }
        isRevisionPending={createRevisionMutation.isPending}
        onClose={handleCloseActionsSheet}
        onShareWhatsApp={handleShareWhatsApp}
        onShareGoogle={handleGoogleMail}
        onShareOutlook={handleOutlookMail}
        onDownload={handleDownloadPdf}
        onRevise={handleReviseFromSheet}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContainer: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },
  flatListContent: {
    paddingHorizontal: PADDING,
    paddingTop: 4,
    gap: GAP,
  },
  flatListContentCompact: {
    paddingHorizontal: PADDING,
    paddingTop: 4,
    gap: 0,
  },
  footerLoading: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  iconBtn: {
    height: 50,
    width: 50,
    borderRadius: 16,
    borderWidth: 1.2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#db2777",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 1,
  },
  viewSwitcher: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 16,
    alignItems: "center",
    height: 50,
    borderWidth: 1,
  },
  switchBtn: {
    borderRadius: 12,
    height: 40,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  metaText: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  sortInlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  sortInlineText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 6,
    letterSpacing: 0.1,
  },
});
