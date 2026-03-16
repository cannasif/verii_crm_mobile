import React, { useMemo } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Add01Icon,
  Edit02Icon,
  Tick02Icon,
  Calendar03Icon,
  Coins01Icon,
  UserIcon,
  ArrowRight01Icon,
} from "hugeicons-react-native";

import { ScreenHeader } from "../../../components/navigation";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useToast } from "../../../hooks/useToast";
import { tempQuickQuotationRepository } from "../repositories/tempQuotattion.repository";
import type { TempQuotattionGetDto } from "../models/tempQuotattion.model";

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("tr-TR");
}

function getCustomerDisplayName(item: TempQuotattionGetDto): string {
  const customerName = item.customerName?.trim();
  return customerName && customerName.length > 0
    ? customerName
    : `Cari ID: ${item.customerId}`;
}

export function TempQuickQuotationListScreen(): React.ReactElement {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { showError, showSuccess } = useToast();
  const { themeMode } = useUIStore();

  const isDark = themeMode === "dark";

  const colors = useMemo(
    () => ({
      mainBg: isDark ? "#09090F" : "#F8FAFC",
      brand: isDark ? "#EC4899" : "#DB2777",
      brandSoft: isDark ? "rgba(236,72,153,0.10)" : "rgba(219,39,119,0.08)",
      cardBg: isDark ? "rgba(17,17,24,0.95)" : "rgba(255,255,255,0.98)",
      softBg: isDark ? "rgba(255,255,255,0.035)" : "#F8FAFC",
      border: isDark ? "rgba(255,255,255,0.16)" : "rgba(148,163,184,0.26)",
      borderStrong: isDark ? "rgba(236,72,153,0.28)" : "rgba(219,39,119,0.22)",
      text: isDark ? "#F8FAFC" : "#0F172A",
      muted: isDark ? "#94A3B8" : "#64748B",
      blue: "#38BDF8",
      blueSoft: "rgba(56,189,248,0.10)",
      green: "#10B981",
      greenSoft: "rgba(16,185,129,0.10)",
      orange: "#F59E0B",
      orangeSoft: "rgba(245,158,11,0.10)",
      shadow: isDark ? "#000000" : "#0F172A",
    }),
    [isDark]
  );

  const gradientColors = (
    isDark
      ? ["rgba(236,72,153,0.08)", "transparent", "rgba(249,115,22,0.05)"]
      : ["rgba(255,235,240,0.55)", "#FFFFFF", "rgba(255,244,237,0.55)"]
  ) as [string, string, ...string[]];

  const queryKey = ["temp-quick-quotation", "list"] as const;

  const listQuery = useQuery({
    queryKey,
    queryFn: () =>
      tempQuickQuotationRepository.getList({
        pageNumber: 1,
        pageSize: 100,
        sortBy: "id",
        sortDirection: "desc",
      }),
  });

  const convertMutation = useMutation({
    mutationFn: (id: number) =>
      tempQuickQuotationRepository.approveAndConvertToQuotation(id),
    onSuccess: () => {
      showSuccess("Teklife dönüştürme akışına alındı");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      showError(
        error instanceof Error
          ? error.message
          : "Teklife dönüştürme başarısız"
      );
    },
  });

  const items = useMemo(() => listQuery.data?.items ?? [], [listQuery.data]);

  const handleCreate = (): void => {
    router.push("/(tabs)/sales/quotations/quick/create");
  };

  const handleRevise = (id: number): void => {
    router.push({
      pathname: "/(tabs)/sales/quotations/quick/create",
      params: { id: String(id) },
    });
  };

  const handleOpenDetail = (id: number): void => {
    router.push({
      pathname: "/(tabs)/sales/quotations/quick/[id]",
      params: { id: String(id) },
    });
  };

  const handleConvert = (id: number): void => {
    convertMutation.mutate(id);
  };

  const renderItem = ({
    item,
  }: {
    item: TempQuotattionGetDto;
  }): React.ReactElement => {
    const statusColor = item.isApproved ? colors.green : colors.orange;
    const statusBg = item.isApproved ? colors.greenSoft : colors.orangeSoft;
    const isConvertDisabled = convertMutation.isPending || item.isApproved;

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => handleOpenDetail(item.id)}
        style={[
          styles.card,
          {
            borderColor: colors.border,
            backgroundColor: colors.cardBg,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.idBadge,
              {
                backgroundColor: colors.brandSoft,
                borderColor: colors.borderStrong,
              },
            ]}
          >
            <Text style={[styles.idText, { color: colors.brand }]}>
              #{item.id}
            </Text>
          </View>

          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: statusBg,
                borderColor: `${statusColor}35`,
              },
            ]}
          >
            <View
              style={[styles.statusDot, { backgroundColor: statusColor }]}
            />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.isApproved ? "Onaylandı" : "Taslak"}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.primaryInfoRow}>
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: colors.brandSoft,
                  borderColor: colors.borderStrong,
                },
              ]}
            >
              <UserIcon size={15} color={colors.brand} variant="stroke" />
            </View>

            <View style={styles.primaryInfoContent}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>
                Cari
              </Text>
              <Text
                style={[styles.customerName, { color: colors.text }]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {getCustomerDisplayName(item)}
              </Text>
              {!!item.customerName && (
                <Text
                  style={[styles.customerSubText, { color: colors.muted }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Cari ID: {item.customerId}
                </Text>
              )}
            </View>

            <View style={styles.openHint}>
              <ArrowRight01Icon size={16} color={colors.muted} variant="stroke" />
            </View>
          </View>

          <View style={styles.metaRow}>
            <View
              style={[
                styles.metaChip,
                {
                  backgroundColor: colors.blueSoft,
                  borderColor: "rgba(56,189,248,0.20)",
                },
              ]}
            >
              <Coins01Icon size={13} color={colors.blue} variant="stroke" />
              <Text
                style={[styles.metaChipText, { color: colors.text }]}
                numberOfLines={1}
              >
                {item.currencyCode || "-"}
              </Text>
            </View>

            <View
              style={[
                styles.metaChip,
                {
                  backgroundColor: colors.softBg,
                  borderColor: colors.border,
                },
              ]}
            >
              <Calendar03Icon size={13} color={colors.muted} variant="stroke" />
              <Text
                style={[styles.metaChipText, { color: colors.text }]}
                numberOfLines={1}
              >
                {formatDate(item.offerDate)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: colors.blueSoft,
                borderColor: "rgba(56,189,248,0.24)",
              },
            ]}
            onPress={() => handleRevise(item.id)}
            activeOpacity={0.78}
          >
            <Edit02Icon size={15} color={colors.blue} variant="stroke" />
            <Text style={[styles.actionBtnText, { color: colors.blue }]}>
              Revize Et
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: colors.greenSoft,
                borderColor: "rgba(16,185,129,0.24)",
                opacity: isConvertDisabled ? 0.5 : 1,
              },
            ]}
            onPress={() => handleConvert(item.id)}
            activeOpacity={0.78}
            disabled={isConvertDisabled}
          >
            {convertMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.green} />
            ) : (
              <>
                <Tick02Icon size={15} color={colors.green} variant="stroke" />
                <Text style={[styles.actionBtnText, { color: colors.green }]}>
                  {item.isApproved ? "Dönüştürüldü" : "Dönüştür"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.mainBg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
      </View>

      <ScreenHeader title="Hızlı Teklif Listesi" showBackButton />

      <View style={styles.topBar}>
        <TouchableOpacity
          style={[
            styles.createButton,
            {
              backgroundColor: colors.cardBg,
              borderColor: colors.borderStrong,
              shadowColor: colors.shadow,
            },
          ]}
          onPress={handleCreate}
          activeOpacity={0.85}
        >
          <View
            style={[
              styles.createButtonIconWrap,
              {
                backgroundColor: colors.brandSoft,
                borderColor: colors.borderStrong,
              },
            ]}
          >
            <Add01Icon size={17} color={colors.brand} variant="stroke" />
          </View>

          <View style={styles.createButtonTextWrap}>
            <Text style={[styles.createButtonTitle, { color: colors.text }]}>
              Yeni hızlı teklif
            </Text>
            <Text style={[styles.createButtonSub, { color: colors.muted }]}>
              Taslak oluştur ve düzenlemeye başla
            </Text>
          </View>

          <ArrowRight01Icon size={17} color={colors.muted} variant="stroke" />
        </TouchableOpacity>
      </View>

      {listQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshing={listQuery.isFetching}
          onRefresh={listQuery.refetch}
          ListEmptyComponent={
            <View style={styles.center}>
              <View
                style={[
                  styles.emptyState,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  Kayıt bulunamadı
                </Text>
                <Text style={[styles.emptyText, { color: colors.muted }]}>
                  Henüz hızlı teklif oluşturulmamış görünüyor.
                </Text>
              </View>
            </View>
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 80 },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  topBar: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },

  createButton: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },

  createButtonIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  createButtonTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  createButtonTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    lineHeight: 17,
  },

  createButtonSub: {
    marginTop: 2,
    fontSize: 10.5,
    fontWeight: "500",
    lineHeight: 13,
  },

  listContent: {
    paddingHorizontal: 16,
    gap: 14,
  },

  card: {
    borderWidth: 1.2,
    borderRadius: 20,
    padding: 14,
    gap: 12,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  idBadge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },

  idText: {
    fontWeight: "800",
    fontSize: 13,
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  statusText: {
    fontWeight: "700",
    fontSize: 10.5,
    textTransform: "uppercase",
  },

  cardBody: {
    gap: 10,
  },

  primaryInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },

  primaryInfoContent: {
    flex: 1,
    minWidth: 0,
  },

  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 12,
    marginBottom: 2,
  },

  customerName: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 17,
  },

  customerSubText: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 12,
  },

  openHint: {
    paddingTop: 2,
    paddingLeft: 6,
  },

  metaRow: {
    flexDirection: "row",
    gap: 8,
  },

  metaChip: {
    flex: 1,
    minHeight: 36,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  metaChipText: {
    flex: 1,
    fontSize: 10.8,
    fontWeight: "500",
    lineHeight: 13,
  },

  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },

  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    gap: 6,
  },

  actionBtnText: {
    fontWeight: "700",
    fontSize: 11.5,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
    paddingHorizontal: 20,
  },

  emptyState: {
    width: "100%",
    maxWidth: 380,
    borderWidth: 1.2,
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },

  emptyText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 16,
  },
});