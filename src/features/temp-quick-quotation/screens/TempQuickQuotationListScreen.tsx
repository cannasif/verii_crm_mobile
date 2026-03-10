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
  const mainBg = isDark ? "#0c0516" : "#FAFAFA";
  const brandColor = isDark ? "#EC4899" : "#DB2777";
  const cardBg = isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.85)";
  const borderColor = isDark
    ? "rgba(236, 72, 153, 0.18)"
    : "rgba(236, 72, 153, 0.25)";
  const textColor = isDark ? "#F8FAFC" : "#1E293B";
  const mutedColor = isDark ? "#94A3B8" : "#64748B";

  const gradientColors = (
    isDark
      ? ["rgba(236, 72, 153, 0.1)", "transparent", "rgba(249, 115, 22, 0.08)"]
      : ["rgba(255, 235, 240, 0.6)", "#FFFFFF", "rgba(255, 240, 225, 0.6)"]
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

  const handleConvert = (id: number): void => {
    convertMutation.mutate(id);
  };

  const renderItem = ({
    item,
  }: {
    item: TempQuotattionGetDto;
  }): React.ReactElement => {
    const statusColor = item.isApproved ? "#10B981" : "#F59E0B";
    const isConvertDisabled = convertMutation.isPending || item.isApproved;

    return (
      <View style={[styles.card, { borderColor, backgroundColor: cardBg }]}>
        <View style={styles.cardHeader}>
          <View style={styles.idBadge}>
            <Text style={[styles.idText, { color: brandColor }]}>
              #{item.id}
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: statusColor + "15",
                borderColor: statusColor + "30",
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
          <View style={styles.infoRow}>
            <UserIcon size={16} color={mutedColor} variant="stroke" />
            <Text style={[styles.infoText, { color: textColor }]}>
              {getCustomerDisplayName(item)}
            </Text>
          </View>
          {!!item.customerName && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoHintText, { color: mutedColor }]}>
                Cari ID: {item.customerId}
              </Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Coins01Icon size={16} color={mutedColor} variant="stroke" />
            <Text style={[styles.infoText, { color: textColor }]}>
              Birim: {item.currencyCode}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Calendar03Icon size={16} color={mutedColor} variant="stroke" />
            <Text style={[styles.infoText, { color: textColor }]}>
              Tarih: {formatDate(item.offerDate)}
            </Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: isDark
                  ? "rgba(14, 165, 233, 0.1)"
                  : "rgba(14, 165, 233, 0.08)",
                borderColor: "rgba(14, 165, 233, 0.2)",
              },
            ]}
            onPress={() => handleRevise(item.id)}
            activeOpacity={0.7}
          >
            <Edit02Icon size={16} color="#0ea5e9" variant="stroke" />
            <Text style={[styles.actionBtnText, { color: "#0ea5e9" }]}>
              Revize Et
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: isDark
                  ? "rgba(16, 185, 129, 0.1)"
                  : "rgba(16, 185, 129, 0.08)",
                borderColor: "rgba(16, 185, 129, 0.2)",
                opacity: isConvertDisabled ? 0.5 : 1,
              },
            ]}
            onPress={() => handleConvert(item.id)}
            activeOpacity={0.7}
            disabled={isConvertDisabled}
          >
            {convertMutation.isPending ? (
              <ActivityIndicator size="small" color="#16a34a" />
            ) : (
              <>
                <Tick02Icon size={16} color="#16a34a" variant="stroke" />
                <Text style={[styles.actionBtnText, { color: "#16a34a" }]}>
                  {item.isApproved ? "Dönüştürüldü" : "Dönüştür"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: mainBg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
      </View>

      <ScreenHeader title="Hızlı Teklif Listesi" showBackButton />

      <View style={styles.topBar}>
        <TouchableOpacity
          style={[
            styles.createButton,
            isDark ? styles.createButtonDark : styles.createButtonLight,
            {
              backgroundColor: isDark
                ? "rgba(236, 72, 153, 0.15)"
                : brandColor,
            },
          ]}
          onPress={handleCreate}
          activeOpacity={0.8}
        >
          <Add01Icon
            size={20}
            color={isDark ? brandColor : "#FFFFFF"}
            variant="stroke"
          />
          <Text
            style={[
              styles.createButtonText,
              { color: isDark ? brandColor : "#FFFFFF" },
            ]}
          >
            Hızlı Teklif Oluştur
          </Text>
        </TouchableOpacity>
      </View>

      {listQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brandColor} />
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
              <Text
                style={{
                  color: mutedColor,
                  fontSize: 15,
                  fontWeight: "500",
                }}
              >
                Kayıt bulunamadı
              </Text>
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
    paddingVertical: 16,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
  },
  createButtonDark: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  createButtonLight: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  createButtonText: {
    fontWeight: "700",
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  idBadge: {
    backgroundColor: "rgba(236, 72, 153, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  idText: {
    fontWeight: "800",
    fontSize: 14,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
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
    fontSize: 11,
    textTransform: "uppercase",
  },
  cardBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    fontWeight: "500",
  },
  infoHintText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 26,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
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
    fontSize: 13,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },
});
