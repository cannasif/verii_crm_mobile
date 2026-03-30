import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "../../../components/navigation";
import { Text } from "../../../components/ui/text";
import { CustomRefreshControl } from "../../../components/CustomRefreshControl";
import { useUIStore } from "../../../store/ui";
import { useWaitingApprovals, useApproveAction, useRejectAction } from "../hooks";
import { ApprovalRow, RejectModal } from "../components";
import type { ApprovalActionGetDto } from "../types";

export function WaitingApprovalsScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, themeMode } = useUIStore();
  const insets = useSafeAreaInsets();

  const [rejectDialogOpen, setRejectDialogOpen] = useState<boolean>(false);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalActionGetDto | null>(null);

  const contentBackground = themeMode === "dark" ? "rgba(20, 10, 30, 0.5)" : colors.background;

  const { data, isLoading, error, refetch, isRefetching } = useWaitingApprovals();
  const approveAction = useApproveAction();
  const rejectAction = useRejectAction();

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleRowClick = useCallback(
    (entityId: number) => {
      router.push(`/(tabs)/sales/demands/${entityId}`);
    },
    [router]
  );

  const handleApprove = useCallback(
    (e: any, approval: ApprovalActionGetDto) => {
      e.stopPropagation();
      approveAction.mutate({ approvalActionId: approval.id });
    },
    [approveAction]
  );

  const handleRejectClick = useCallback(
    (e: any, approval: ApprovalActionGetDto) => {
      e.stopPropagation();
      setSelectedApproval(approval);
      setRejectDialogOpen(true);
    },
    []
  );

  const handleRejectConfirm = useCallback(
    (rejectReason: string) => {
      if (!selectedApproval) return;
      rejectAction.mutate(
        {
          approvalActionId: selectedApproval.id,
          rejectReason: rejectReason.trim() || null,
        },
        {
          onSuccess: () => {
            setRejectDialogOpen(false);
            setSelectedApproval(null);
          },
        }
      );
    },
    [selectedApproval, rejectAction]
  );

  const handleCloseModal = useCallback(() => {
    if (!rejectAction.isPending) {
      setRejectDialogOpen(false);
      setSelectedApproval(null);
    }
  }, [rejectAction.isPending]);

  const renderItem = useCallback(
    ({ item }: { item: ApprovalActionGetDto }) => {
      return (
        <ApprovalRow
          approval={item}
          onPress={handleRowClick}
          onApprove={handleApprove}
          onReject={handleRejectClick}
          isPending={approveAction.isPending || rejectAction.isPending}
        />
      );
    },
    [handleRowClick, handleApprove, handleRejectClick, approveAction.isPending, rejectAction.isPending]
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📄</Text>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {t("demand.noWaitingApprovals")}
        </Text>
      </View>
    );
  }, [isLoading, colors, t]);

  const renderHeader = useCallback(() => {
    return (
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t("demand.waitingApprovalsList")}
          </Text>
          {data && data.length > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.activeBackground }]}>
              <Text style={[styles.badgeText, { color: colors.accent }]}>{data.length}</Text>
            </View>
          )}
        </View>
        <Text style={styles.clockIcon}>🕐</Text>
      </View>
    );
  }, [data, colors, t]);

  return (
    <>
      <StatusBar style="light" />
      <View style={[styles.container, { backgroundColor: colors.header }]}>
        <ScreenHeader title={t("demand.waitingApprovals")} showBackButton />
        <View style={[styles.content, { backgroundColor: contentBackground }]}>
          {isLoading && !data ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: colors.error }]}>
                {t("common.error")}
              </Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: colors.accent }]}
                onPress={() => refetch()}
              >
                <Text style={styles.retryButtonText}>{t("common.retry")}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={data || []}
              renderItem={renderItem}
              keyExtractor={(item) => item.id.toString()}
              ListHeaderComponent={renderHeader}
              ListEmptyComponent={renderEmpty}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: insets.bottom + 100 },
              ]}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <CustomRefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
              }
            />
          )}
        </View>

        <RejectModal
          visible={rejectDialogOpen}
          approval={selectedApproval}
          onClose={handleCloseModal}
          onConfirm={handleRejectConfirm}
          isPending={rejectAction.isPending}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  clockIcon: {
    fontSize: 20,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
  },
});
