import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import {
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  File01Icon,
  File02Icon,
  SecurityCheckIcon,
  Tick02Icon,
  UserGroupIcon,
  UserIcon,
} from "hugeicons-react-native";

import { Text } from "../../components/ui/text";
import { ScreenHeader } from "../../components/navigation";
import { useUIStore } from "../../store/ui";
import { useAuthStore } from "../../store/auth";
import { visibilitySimulatorApi } from "../../features/access-control/api/visibilitySimulatorApi";

const ENTITY_OPTIONS = [
  { value: "Quotation", labelKey: "accessControlSimulator.entityQuotation" },
  { value: "Demand", labelKey: "accessControlSimulator.entityDemand" },
  { value: "Order", labelKey: "accessControlSimulator.entityOrder" },
  { value: "Activity", labelKey: "accessControlSimulator.entityActivity" },
  { value: "Salesman360", labelKey: "accessControlSimulator.entitySalesman360" },
] as const;

type ThemeTokens = {
  isDark: boolean;
  mainBg: string;
  gradientColors: [string, string, ...string[]];
  cardBg: string;
  inputBg: string;
  borderColor: string;
  softBorder: string;
  textColor: string;
  mutedColor: string;
  brandColor: string;
  successColor: string;
  errorColor: string;
};

function useSimulatorTheme(): ThemeTokens {
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  return {
    isDark,
    mainBg: isDark ? "#0c0516" : "#FAFAFA",
    gradientColors: isDark
      ? ["rgba(236, 72, 153, 0.12)", "transparent", "rgba(249, 115, 22, 0.12)"]
      : ["rgba(255, 235, 240, 0.6)", "#FFFFFF", "rgba(255, 240, 225, 0.6)"],
    cardBg: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.85)",
    inputBg: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.6)",
    borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(236, 72, 153, 0.25)",
    softBorder: isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.14)",
    textColor: isDark ? "#F8FAFC" : "#1E293B",
    mutedColor: isDark ? "#94A3B8" : "#64748B",
    brandColor: isDark ? "#EC4899" : "#DB2777",
    successColor: "#10B981",
    errorColor: "#EF4444",
  };
}

function SectionCard({
  children,
  theme,
}: {
  children: React.ReactNode;
  theme: ThemeTokens;
}): React.ReactElement {
  return (
    <View style={[styles.sectionCard, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
      {children}
    </View>
  );
}

function FieldLabel({
  icon,
  label,
  theme,
}: {
  icon: React.ReactNode;
  label: string;
  theme: ThemeTokens;
}): React.ReactElement {
  return (
    <View style={styles.fieldLabelRow}>
      <View style={[styles.fieldIconBox, { backgroundColor: theme.isDark ? "rgba(236, 72, 153, 0.08)" : "rgba(219, 39, 119, 0.08)" }]}>
        {icon}
      </View>
      <Text style={[styles.fieldLabel, { color: theme.textColor }]}>{label}</Text>
    </View>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  theme,
  accentColor,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  theme: ThemeTokens;
  accentColor: string;
}): React.ReactElement {
  return (
    <View style={[styles.summaryCard, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
      <View style={[styles.summaryIconWrap, { backgroundColor: `${accentColor}${theme.isDark ? "18" : "12"}` }]}>
        {icon}
      </View>
      <Text style={[styles.summaryLabel, { color: theme.mutedColor }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: theme.textColor }]}>{value}</Text>
    </View>
  );
}

function EmptyState({
  message,
  theme,
}: {
  message: string;
  theme: ThemeTokens;
}): React.ReactElement {
  return (
    <View style={[styles.emptyState, { backgroundColor: theme.inputBg, borderColor: theme.softBorder }]}>
      <Text style={[styles.emptyText, { color: theme.mutedColor }]}>{message}</Text>
    </View>
  );
}

export default function AccessControlSimulatorScreen(): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const theme = useSimulatorTheme();
  const currentUser = useAuthStore((state) => state.user);

  const [selectedEntityType, setSelectedEntityType] = useState("Quotation");
  const [userIdInput, setUserIdInput] = useState(currentUser?.id ? String(currentUser.id) : "");
  const [recordIdInput, setRecordIdInput] = useState("");

  const userId = useMemo(() => {
    const numeric = Number.parseInt(userIdInput, 10);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }, [userIdInput]);

  const recordId = useMemo(() => {
    const numeric = Number.parseInt(recordIdInput, 10);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }, [recordIdInput]);

  const previewQuery = useQuery({
    queryKey: ["mobile-visibility-preview", userId, selectedEntityType],
    enabled: userId != null,
    queryFn: () => visibilitySimulatorApi.preview(userId!, selectedEntityType),
  });

  const simulationQuery = useQuery({
    queryKey: ["mobile-visibility-simulate", userId, selectedEntityType, recordId],
    enabled: userId != null && recordId != null,
    queryFn: () => visibilitySimulatorApi.simulate(userId!, selectedEntityType, recordId!),
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.mainBg }]}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />

      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={theme.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <ScreenHeader title={t("accessControlSimulator.title")} showBackButton />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.groupTitle, { color: theme.mutedColor }]}>
          {t("accessControlSimulator.filtersTitle")}
        </Text>

        <SectionCard theme={theme}>
          <Text style={[styles.sectionDescription, { color: theme.mutedColor }]}>
            {t("accessControlSimulator.filtersDescription")}
          </Text>

          <View style={styles.field}>
            <FieldLabel
              icon={<UserIcon size={16} color={theme.brandColor} variant="stroke" />}
              label={t("accessControlSimulator.userId")}
              theme={theme}
            />
            <TextInput
              value={userIdInput}
              onChangeText={(value) => setUserIdInput(value.replace(/[^\d]/g, ""))}
              placeholder={currentUser?.id ? String(currentUser.id) : "1"}
              placeholderTextColor={theme.mutedColor}
              keyboardType="number-pad"
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.borderColor,
                  color: theme.textColor,
                },
              ]}
            />
          </View>

          <View style={styles.field}>
            <FieldLabel
              icon={<File02Icon size={16} color={theme.brandColor} variant="stroke" />}
              label={t("accessControlSimulator.entity")}
              theme={theme}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.entityScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {ENTITY_OPTIONS.map((option) => {
                const isActive = option.value === selectedEntityType;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setSelectedEntityType(option.value)}
                    style={[
                      styles.entityChip,
                      {
                        backgroundColor: isActive
                          ? theme.isDark
                            ? "rgba(236, 72, 153, 0.1)"
                            : "rgba(219, 39, 119, 0.1)"
                          : theme.inputBg,
                        borderColor: isActive
                          ? theme.isDark
                            ? "rgba(236, 72, 153, 0.3)"
                            : "rgba(219, 39, 119, 0.3)"
                          : theme.borderColor,
                      },
                    ]}
                  >
                    {isActive ? (
                      <Tick02Icon size={14} color={theme.brandColor} variant="stroke" />
                    ) : null}
                    <Text
                      style={[
                        styles.entityChipText,
                        {
                          color: isActive ? theme.brandColor : theme.mutedColor,
                          fontWeight: isActive ? "700" : "500",
                        },
                      ]}
                    >
                      {t(option.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.field}>
            <FieldLabel
              icon={<File01Icon size={16} color={theme.brandColor} variant="stroke" />}
              label={t("accessControlSimulator.recordId")}
              theme={theme}
            />
            <TextInput
              value={recordIdInput}
              onChangeText={(value) => setRecordIdInput(value.replace(/[^\d]/g, ""))}
              placeholder="125"
              placeholderTextColor={theme.mutedColor}
              keyboardType="number-pad"
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.borderColor,
                  color: theme.textColor,
                },
              ]}
            />
          </View>
        </SectionCard>

        <View style={styles.summaryGrid}>
          <SummaryCard
            label={t("accessControlSimulator.visibleUsers")}
            value={String(previewQuery.data?.visibleUsers.length ?? 0)}
            icon={<UserGroupIcon size={18} color="#3B82F6" variant="stroke" />}
            theme={theme}
            accentColor="#3B82F6"
          />
          <SummaryCard
            label={t("accessControlSimulator.approvalOverrides")}
            value={String(previewQuery.data?.approvalOverrideAuditEntries.length ?? 0)}
            icon={<SecurityCheckIcon size={18} color="#F59E0B" variant="stroke" />}
            theme={theme}
            accentColor="#F59E0B"
          />
        </View>

        <Text style={[styles.groupTitle, { color: theme.mutedColor }]}>
          {t("accessControlSimulator.actionPanelTitle")}
        </Text>

        <SectionCard theme={theme}>
          {recordId == null ? (
            <EmptyState message={t("accessControlSimulator.noRecordSimulation")} theme={theme} />
          ) : simulationQuery.isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={theme.brandColor} />
            </View>
          ) : simulationQuery.data ? (
            <View style={styles.actionList}>
              {simulationQuery.data.actions.map((action) => {
                const isAllowed = action.allowed;
                const statusColor = isAllowed ? theme.successColor : theme.errorColor;

                return (
                  <View
                    key={action.action}
                    style={[
                      styles.actionCard,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.softBorder,
                        borderLeftColor: statusColor,
                      },
                    ]}
                  >
                    <View style={styles.actionHeader}>
                      <Text style={[styles.actionTitle, { color: theme.textColor }]}>
                        {t(`accessControlSimulator.action.${action.action}`)}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: `${statusColor}${theme.isDark ? "20" : "14"}`,
                            borderColor: `${statusColor}${theme.isDark ? "40" : "30"}`,
                          },
                        ]}
                      >
                        {isAllowed ? (
                          <CheckmarkCircle02Icon size={14} color={statusColor} variant="stroke" />
                        ) : (
                          <CancelCircleIcon size={14} color={statusColor} variant="stroke" />
                        )}
                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                          {isAllowed
                            ? t("accessControlSimulator.allowed")
                            : t("accessControlSimulator.denied")}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.actionReason, { color: theme.mutedColor }]}>
                      {action.reason}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <EmptyState message={t("accessControlSimulator.awaitingSelection")} theme={theme} />
          )}
        </SectionCard>

        <Text style={[styles.groupTitle, { color: theme.mutedColor }]}>
          {t("accessControlSimulator.auditTitle")}
        </Text>

        <SectionCard theme={theme}>
          {previewQuery.isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={theme.brandColor} />
            </View>
          ) : previewQuery.data?.approvalOverrideAuditEntries.length ? (
            <View style={styles.auditList}>
              {previewQuery.data.approvalOverrideAuditEntries.map((entry) => (
                <View
                  key={entry.approvalActionId}
                  style={[
                    styles.auditCard,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: theme.softBorder,
                      borderLeftColor: theme.brandColor,
                    },
                  ]}
                >
                  <Text style={[styles.auditTitle, { color: theme.textColor }]}>
                    {t("accessControlSimulator.auditRecord", { id: entry.entityId })}
                  </Text>
                  <View style={styles.auditMetaRow}>
                    <Text style={[styles.auditMeta, { color: theme.mutedColor }]}>
                      {t("accessControlSimulator.auditStep", {
                        step: entry.stepOrder,
                        current: entry.currentStep,
                      })}
                    </Text>
                  </View>
                  <Text style={[styles.auditMeta, { color: theme.mutedColor }]}>
                    {t("accessControlSimulator.auditFlow")}: {entry.flowDescription || "-"}
                  </Text>
                  <Text style={[styles.auditMeta, { color: theme.mutedColor }]}>
                    {t("accessControlSimulator.auditApprover")}:{" "}
                    {entry.approvedByUserName || `#${entry.approvedByUserId}`}
                  </Text>
                  <Text style={[styles.auditReason, { color: theme.textColor }]}>
                    {entry.reason}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState message={t("accessControlSimulator.noAudit")} theme={theme} />
          )}
        </SectionCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: 4,
    marginBottom: -4,
    paddingHorizontal: 2,
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 20,
  },
  field: {
    gap: 10,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fieldIconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontWeight: "500",
  },
  entityScrollContent: {
    gap: 8,
    paddingRight: 4,
  },
  entityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  entityChipText: {
    fontSize: 13,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  summaryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  actionList: {
    gap: 10,
  },
  actionCard: {
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  actionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  actionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  actionReason: {
    fontSize: 13,
    lineHeight: 20,
  },
  auditList: {
    gap: 10,
  },
  auditCard: {
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  auditTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  auditMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  auditMeta: {
    fontSize: 12,
    lineHeight: 18,
  },
  auditReason: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
    fontWeight: "500",
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 14,
    borderStyle: "dashed",
    paddingHorizontal: 14,
    paddingVertical: 18,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  loadingWrap: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
