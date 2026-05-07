import React from "react";
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { useTranslation } from "react-i18next";
import {
  CheckmarkCircle02Icon,
  Clock04Icon,
  Cancel01Icon,
  CircleIcon,
  UserIcon,
  Mail01Icon,
  Calendar03Icon,
  Alert02Icon,
  Note01Icon,
  WorkflowSquare06Icon,
} from "hugeicons-react-native";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useQuotationApprovalFlowReport } from "../hooks/useQuotationApprovalFlowReport";
import type { ApprovalFlowStepReportDto, ApprovalActionDetailDto } from "../types";

const STEP_STATUS_IN_PROGRESS = "InProgress";
const STEP_STATUS_COMPLETED = "Completed";
const STEP_STATUS_REJECTED = "Rejected";

function formatActionDate(isoDate: string | null, locale: string): string {
  if (!isoDate) return "";
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString(locale === "en" ? "en-GB" : "tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoDate;
  }
}

interface QuotationApprovalFlowTabProps {
  quotationId: number;
}

interface StepPalette {
  primary: string;
  soft: string;
  border: string;
  Icon: React.ComponentType<{ size?: number; color?: string; variant?: "stroke"; strokeWidth?: number }>;
}

function resolveStepPalette(stepStatus: string, isDark: boolean): StepPalette {
  if (stepStatus === STEP_STATUS_COMPLETED) {
    return {
      primary: isDark ? "#34d399" : "#059669",
      soft: isDark ? "rgba(52,211,153,0.16)" : "rgba(16,185,129,0.12)",
      border: isDark ? "rgba(52,211,153,0.42)" : "rgba(16,185,129,0.34)",
      Icon: CheckmarkCircle02Icon,
    };
  }
  if (stepStatus === STEP_STATUS_IN_PROGRESS) {
    return {
      primary: isDark ? "#fbbf24" : "#D97706",
      soft: isDark ? "rgba(251,191,36,0.16)" : "rgba(245,158,11,0.12)",
      border: isDark ? "rgba(251,191,36,0.42)" : "rgba(245,158,11,0.34)",
      Icon: Clock04Icon,
    };
  }
  if (stepStatus === STEP_STATUS_REJECTED) {
    return {
      primary: isDark ? "#f472b6" : "#DB2777",
      soft: isDark ? "rgba(244,114,182,0.16)" : "rgba(219,39,119,0.10)",
      border: isDark ? "rgba(244,114,182,0.42)" : "rgba(219,39,119,0.34)",
      Icon: Cancel01Icon,
    };
  }
  return {
    primary: isDark ? "#94A3B8" : "#64748B",
    soft: isDark ? "rgba(148,163,184,0.14)" : "rgba(148,163,184,0.16)",
    border: isDark ? "rgba(148,163,184,0.34)" : "rgba(148,163,184,0.34)",
    Icon: CircleIcon,
  };
}

function getInitials(name: string | null | undefined, fallback: string): string {
  const value = (name ?? "").trim();
  if (!value) return fallback.slice(0, 2).toUpperCase();
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function ActionRow({ action, locale, isDark }: { action: ApprovalActionDetailDto; locale: string; isDark: boolean }): React.ReactElement {
  const { colors } = useUIStore();
  const isApproved = action.status === 2;
  const isRejected = action.status === 3;
  const chipPalette = isApproved
    ? { fg: isDark ? "#34d399" : "#059669", bg: isDark ? "rgba(52,211,153,0.16)" : "rgba(16,185,129,0.12)" }
    : isRejected
      ? { fg: isDark ? "#f472b6" : "#DB2777", bg: isDark ? "rgba(244,114,182,0.16)" : "rgba(219,39,119,0.10)" }
      : { fg: isDark ? "#94A3B8" : "#64748B", bg: isDark ? "rgba(148,163,184,0.14)" : "rgba(148,163,184,0.16)" };

  const displayName = action.userFullName ?? action.userEmail ?? String(action.userId);
  const avatarBg = isDark ? "rgba(99,102,241,0.18)" : "rgba(99,102,241,0.12)";
  const avatarBorder = isDark ? "rgba(165,180,252,0.40)" : "rgba(99,102,241,0.32)";
  const avatarText = isDark ? "#A5B4FC" : "#4F46E5";
  const cardBg = isDark ? "rgba(15,23,42,0.55)" : "rgba(248,250,252,0.85)";
  const cardBorder = isDark ? "rgba(148,163,184,0.18)" : "rgba(148,163,184,0.22)";

  return (
    <View style={[styles.actionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <View style={styles.actionHeader}>
        <View style={[styles.avatar, { backgroundColor: avatarBg, borderColor: avatarBorder }]}>
          <Text style={[styles.avatarText, { color: avatarText }]}>
            {getInitials(action.userFullName, action.userEmail ?? "U")}
          </Text>
        </View>
        <View style={styles.actionHeaderText}>
          <Text style={[styles.actionName, { color: colors.text }]} numberOfLines={1}>
            {displayName}
          </Text>
          {action.userEmail ? (
            <View style={styles.actionMetaRow}>
              <Mail01Icon size={11} color={colors.textMuted} variant="stroke" strokeWidth={2} />
              <Text style={[styles.actionEmail, { color: colors.textMuted }]} numberOfLines={1}>
                {action.userEmail}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={[styles.statusChip, { backgroundColor: chipPalette.bg }]}>
          <Text style={[styles.statusChipText, { color: chipPalette.fg }]} numberOfLines={1}>
            {action.statusName}
          </Text>
        </View>
      </View>
      {action.actionDate ? (
        <View style={styles.actionDateRow}>
          <Calendar03Icon size={12} color={colors.textMuted} variant="stroke" strokeWidth={2} />
          <Text style={[styles.actionDate, { color: colors.textMuted }]}>
            {formatActionDate(action.actionDate, locale)}
          </Text>
        </View>
      ) : null}
      {action.rejectedReason ? (
        <View
          style={[
            styles.rejectReasonBox,
            {
              backgroundColor: isDark ? "rgba(244,114,182,0.12)" : "rgba(219,39,119,0.08)",
              borderColor: isDark ? "rgba(244,114,182,0.32)" : "rgba(219,39,119,0.26)",
            },
          ]}
        >
          <Note01Icon size={12} color={isDark ? "#f472b6" : "#DB2777"} variant="stroke" strokeWidth={2.2} />
          <Text style={[styles.rejectReasonText, { color: isDark ? "#fbcfe8" : "#9D174D" }]} numberOfLines={4}>
            {action.rejectedReason}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

interface StepCardProps {
  step: ApprovalFlowStepReportDto;
  locale: string;
  isDark: boolean;
  isLast: boolean;
}

function StepCard({ step, locale, isDark, isLast }: StepCardProps): React.ReactElement {
  const { colors } = useUIStore();
  const palette = resolveStepPalette(step.stepStatus, isDark);
  const cardBg = isDark ? "rgba(30,27,75,0.55)" : "#FFFFFF";

  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineRail}>
        <View style={[styles.timelineNode, { backgroundColor: palette.soft, borderColor: palette.border }]}>
          <palette.Icon size={20} color={palette.primary} variant="stroke" strokeWidth={2.4} />
        </View>
        {!isLast ? (
          <View
            style={[
              styles.timelineConnector,
              { backgroundColor: isDark ? "rgba(148,163,184,0.22)" : "rgba(148,163,184,0.30)" },
            ]}
          />
        ) : null}
      </View>
      <View
        style={[
          styles.stepCard,
          { backgroundColor: cardBg, borderColor: palette.border, shadowColor: palette.primary },
        ]}
      >
        <View style={[styles.stepStripe, { backgroundColor: palette.primary }]} />
        <View style={styles.stepBody}>
          <View style={styles.stepHeader}>
            <Text style={[styles.stepName, { color: colors.text }]} numberOfLines={2}>
              {step.stepName}
            </Text>
            <View style={[styles.stepStatusPill, { backgroundColor: palette.soft }]}>
              <Text style={[styles.stepStatusText, { color: palette.primary }]} numberOfLines={1}>
                {step.stepStatus}
              </Text>
            </View>
          </View>
          {step.actions.length > 0 ? (
            <View style={styles.actionsContainer}>
              {step.actions.map((action, idx) => (
                <ActionRow key={`${action.userId}-${idx}`} action={action} locale={locale} isDark={isDark} />
              ))}
            </View>
          ) : (
            <Text style={[styles.noActionText, { color: colors.textMuted }]}>—</Text>
          )}
        </View>
      </View>
    </View>
  );
}

export function QuotationApprovalFlowTab({ quotationId }: QuotationApprovalFlowTabProps): React.ReactElement {
  const { t, i18n } = useTranslation();
  const { colors, themeMode } = useUIStore();
  const isDark = themeMode === "dark";
  const { data, isLoading, isError, error, refetch } = useQuotationApprovalFlowReport(quotationId);
  const locale = i18n.language?.startsWith("en") ? "en" : "tr";

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: "transparent" }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.centered, styles.errorBox]}>
        <Alert02Icon size={28} color={colors.error} variant="stroke" strokeWidth={2.2} />
        <Text style={[styles.errorText, { color: colors.error }]}>
          {error?.message ?? t("common.error")}
        </Text>
        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.accent }]} onPress={() => refetch()}>
          <Text style={styles.retryBtnText}>{t("common.retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.centered]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t("common.error")}</Text>
      </View>
    );
  }

  if (!data.hasApprovalRequest) {
    const emptyBg = isDark ? "rgba(30,27,75,0.55)" : "#FFFFFF";
    const emptyBorder = isDark ? "rgba(148,163,184,0.22)" : "rgba(148,163,184,0.26)";
    return (
      <View style={[styles.centered, styles.emptyBox]}>
        <View style={[styles.emptyCard, { backgroundColor: emptyBg, borderColor: emptyBorder }]}>
          <View
            style={[
              styles.emptyIconWrap,
              {
                backgroundColor: isDark ? "rgba(148,163,184,0.16)" : "rgba(148,163,184,0.14)",
                borderColor: isDark ? "rgba(148,163,184,0.32)" : "rgba(148,163,184,0.30)",
              },
            ]}
          >
            <WorkflowSquare06Icon size={24} color={isDark ? "#94A3B8" : "#475569"} variant="stroke" strokeWidth={2} />
          </View>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t("quotation.approvalFlow.notStarted")}
          </Text>
        </View>
      </View>
    );
  }

  const overallChipPalette = (() => {
    const status = data.overallStatusName?.toLowerCase() ?? "";
    if (status.includes("approve") || status.includes("onayla")) {
      return { fg: isDark ? "#34d399" : "#059669", bg: isDark ? "rgba(52,211,153,0.16)" : "rgba(16,185,129,0.12)" };
    }
    if (status.includes("reject") || status.includes("redd")) {
      return { fg: isDark ? "#f472b6" : "#DB2777", bg: isDark ? "rgba(244,114,182,0.16)" : "rgba(219,39,119,0.10)" };
    }
    if (status.includes("progress") || status.includes("bekle") || status.includes("onayda")) {
      return { fg: isDark ? "#fbbf24" : "#D97706", bg: isDark ? "rgba(251,191,36,0.16)" : "rgba(245,158,11,0.12)" };
    }
    return { fg: isDark ? "#A5B4FC" : "#4F46E5", bg: isDark ? "rgba(99,102,241,0.16)" : "rgba(99,102,241,0.12)" };
  })();

  const cardBg = isDark ? "rgba(30,27,75,0.55)" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(148,163,184,0.22)" : "rgba(148,163,184,0.26)";
  const labelColor = isDark ? "#A5B4FC" : "#6366F1";

  return (
    <FlatListScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {data.flowDescription ? (
        <LinearGradient
          colors={isDark ? ["rgba(99,102,241,0.18)", "rgba(99,102,241,0.06)"] : ["rgba(99,102,241,0.10)", "rgba(99,102,241,0.02)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerCard, { borderColor: isDark ? "rgba(165,180,252,0.32)" : "rgba(99,102,241,0.24)" }]}
        >
          <View style={styles.headerCardRow}>
            <View
              style={[
                styles.headerIconWrap,
                {
                  backgroundColor: isDark ? "rgba(99,102,241,0.20)" : "rgba(99,102,241,0.14)",
                  borderColor: isDark ? "rgba(165,180,252,0.40)" : "rgba(99,102,241,0.34)",
                },
              ]}
            >
              <WorkflowSquare06Icon size={18} color={labelColor} variant="stroke" strokeWidth={2.2} />
            </View>
            <View style={styles.headerCardTextWrap}>
              <Text style={[styles.headerLabel, { color: labelColor }]}>
                {t("quotation.approvalFlow.flowDescription")}
              </Text>
              <Text style={[styles.headerValue, { color: colors.text }]}>{data.flowDescription}</Text>
            </View>
          </View>
        </LinearGradient>
      ) : null}

      {data.overallStatusName ? (
        <View style={[styles.overallCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.overallLabelRow}>
            <UserIcon size={14} color={colors.textMuted} variant="stroke" strokeWidth={2} />
            <Text style={[styles.overallLabel, { color: colors.textMuted }]}>
              {t("quotation.approvalFlow.overallStatus")}
            </Text>
          </View>
          <View style={[styles.overallChip, { backgroundColor: overallChipPalette.bg }]}>
            <Text style={[styles.overallChipText, { color: overallChipPalette.fg }]} numberOfLines={1}>
              {data.overallStatusName}
            </Text>
          </View>
        </View>
      ) : null}

      {data.rejectedReason ? (
        <View
          style={[
            styles.rejectedBox,
            {
              backgroundColor: isDark ? "rgba(244,114,182,0.12)" : "rgba(219,39,119,0.08)",
              borderColor: isDark ? "rgba(244,114,182,0.34)" : "rgba(219,39,119,0.28)",
            },
          ]}
        >
          <View style={styles.rejectedHeader}>
            <Alert02Icon size={16} color={isDark ? "#f472b6" : "#DB2777"} variant="stroke" strokeWidth={2.2} />
            <Text style={[styles.rejectedLabel, { color: isDark ? "#f472b6" : "#DB2777" }]}>
              {t("quotation.approvalFlow.rejectedReason")}
            </Text>
          </View>
          <Text style={[styles.rejectedText, { color: colors.text }]}>{data.rejectedReason}</Text>
        </View>
      ) : null}

      <View style={styles.timeline}>
        {data.steps.map((step, idx) => (
          <StepCard
            key={step.stepOrder}
            step={step}
            locale={locale}
            isDark={isDark}
            isLast={idx === data.steps.length - 1}
          />
        ))}
      </View>
    </FlatListScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorBox: { flex: 1, gap: 12 },
  errorText: { fontSize: 14, textAlign: "center", marginBottom: 4 },
  retryBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  retryBtnText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  emptyBox: { flex: 1, paddingTop: 32 },
  emptyCard: {
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
    minWidth: 260,
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { fontSize: 14, textAlign: "center", fontWeight: "500" },

  headerCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  headerCardRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCardTextWrap: { flex: 1 },
  headerLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 4 },
  headerValue: { fontSize: 14, fontWeight: "500", lineHeight: 20 },

  overallCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  overallLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  overallLabel: { fontSize: 12, fontWeight: "600" },
  overallChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    maxWidth: "60%",
  },
  overallChipText: { fontSize: 12, fontWeight: "700" },

  rejectedBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  rejectedHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  rejectedLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3, textTransform: "uppercase" },
  rejectedText: { fontSize: 13, lineHeight: 18 },

  timeline: { marginTop: 4 },
  timelineRow: { flexDirection: "row", alignItems: "stretch" },
  timelineRail: { width: 44, alignItems: "center" },
  timelineNode: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    marginVertical: 4,
    borderRadius: 1,
  },

  stepCard: {
    flex: 1,
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  stepStripe: { width: 4 },
  stepBody: { flex: 1, padding: 12 },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  stepName: { fontSize: 15, fontWeight: "700", flex: 1 },
  stepStatusPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  stepStatusText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },

  actionsContainer: { gap: 8 },
  noActionText: { fontSize: 13, fontStyle: "italic", textAlign: "center", paddingVertical: 4 },

  actionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  actionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },
  actionHeaderText: { flex: 1 },
  actionName: { fontSize: 13, fontWeight: "600" },
  actionMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  actionEmail: { fontSize: 11, flex: 1 },
  statusChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    maxWidth: 110,
  },
  statusChipText: { fontSize: 11, fontWeight: "700" },
  actionDateRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionDate: { fontSize: 11 },
  rejectReasonBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  rejectReasonText: { flex: 1, fontSize: 12, lineHeight: 16 },
});
