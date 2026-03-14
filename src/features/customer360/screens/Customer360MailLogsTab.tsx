import React, { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import {
  Mail01Icon,
  Calendar03Icon,
  UserIcon,
  Alert02Icon,
  Tick02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "hugeicons-react-native";
import { integrationApi, type CustomerMailLogDto } from "../../integration";

type MailProvider = "google" | "outlook";

interface Customer360MailLogsTabProps {
  customerId: number;
  colors: Record<string, string>;
}

function formatDate(value: string, locale: string): string {
  const date = new Date(value);
  return date.toLocaleString(locale);
}

function StatusBadge({
  ok,
  successText,
  failedText,
}: {
  ok: boolean;
  successText: string;
  failedText: string;
}): React.ReactElement {
  const tone = ok
    ? {
        text: "#10B981",
        bg: "rgba(16,185,129,0.10)",
        border: "rgba(16,185,129,0.20)",
      }
    : {
        text: "#EF4444",
        bg: "rgba(239,68,68,0.10)",
        border: "rgba(239,68,68,0.20)",
      };

  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor: tone.bg,
          borderColor: tone.border,
        },
      ]}
    >
      {ok ? (
        <Tick02Icon size={11} color={tone.text} variant="stroke" />
      ) : (
        <Alert02Icon size={11} color={tone.text} variant="stroke" />
      )}
      <Text style={[styles.statusText, { color: tone.text }]}>
        {ok ? successText : failedText}
      </Text>
    </View>
  );
}

function ProviderButton({
  active,
  label,
  activeColor,
  defaultBg,
  defaultBorder,
  defaultText,
  onPress,
}: {
  active: boolean;
  label: string;
  activeColor: string;
  defaultBg: string;
  defaultBorder: string;
  defaultText: string;
  onPress: () => void;
}): React.ReactElement {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={[
        styles.providerButton,
        {
          borderColor: active ? activeColor : defaultBorder,
          backgroundColor: active ? `${activeColor}14` : defaultBg,
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.providerText,
          {
            color: active ? activeColor : defaultText,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function InfoRow({
  icon,
  text,
  color,
}: {
  icon: React.ReactNode;
  text: string;
  color: string;
}): React.ReactElement {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>{icon}</View>
      <Text style={[styles.cardLine, { color }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function MailLogCard({
  log,
  colors,
  locale,
  successText,
  failedText,
  isDark,
}: {
  log: CustomerMailLogDto;
  colors: Record<string, string>;
  locale: string;
  successText: string;
  failedText: string;
  isDark: boolean;
}): React.ReactElement {
  const softBg = isDark ? "rgba(255,255,255,0.025)" : "rgba(15,23,42,0.025)";
  const softBorder = isDark ? "rgba(255,255,255,0.05)" : "rgba(148,163,184,0.10)";

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.mailIconWrap,
            {
              backgroundColor: softBg,
              borderColor: softBorder,
            },
          ]}
        >
          <Mail01Icon size={14} color={colors.accent} variant="stroke" />
        </View>

        <View style={styles.cardHeaderText}>
          <Text style={[styles.cardSubject, { color: colors.text }]} numberOfLines={2}>
            {log.subject || "-"}
          </Text>
          <Text style={[styles.cardDate, { color: colors.textMuted }]}>
            {formatDate(log.createdDate, locale)}
          </Text>
        </View>

        <StatusBadge ok={log.isSuccess} successText={successText} failedText={failedText} />
      </View>

      <View style={styles.infoBlock}>
        <InfoRow
          icon={<Mail01Icon size={12} color={colors.textMuted} variant="stroke" />}
          text={log.toEmails || "-"}
          color={colors.textMuted}
        />
        <InfoRow
          icon={<UserIcon size={12} color={colors.textMuted} variant="stroke" />}
          text={log.sentByUserName || "-"}
          color={colors.textMuted}
        />
      </View>

      {log.errorCode ? (
        <View
          style={[
            styles.errorBox,
            {
              backgroundColor: "rgba(239,68,68,0.08)",
              borderColor: "rgba(239,68,68,0.18)",
            },
          ]}
        >
          <Alert02Icon size={12} color="#EF4444" variant="stroke" />
          <Text style={styles.errorLine} numberOfLines={2}>
            {log.errorCode}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function Customer360MailLogsTab({
  customerId,
  colors,
}: Customer360MailLogsTabProps): React.ReactElement {
  const { t, i18n } = useTranslation();
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";
  const locale = i18n.language === "tr" ? "tr-TR" : "en-US";

  const [provider, setProvider] = useState<MailProvider>("google");
  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 10;

  const surfaceBg = isDark ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.92)";
  const surfaceBorder = isDark ? "rgba(255,255,255,0.05)" : "rgba(148,163,184,0.10)";

  const query = useQuery({
    queryKey: ["customer360", "mail-logs", provider, customerId, pageNumber, pageSize],
    queryFn: () =>
      provider === "google"
        ? integrationApi.getGoogleCustomerMailLogs({
            customerId,
            pageNumber,
            pageSize,
            sortBy: "createdDate",
            sortDirection: "desc",
          })
        : integrationApi.getOutlookCustomerMailLogs({
            customerId,
            pageNumber,
            pageSize,
            sortBy: "createdDate",
            sortDirection: "desc",
          }),
    enabled: customerId > 0,
  });

  const logs = useMemo(() => query.data?.items ?? [], [query.data?.items]);

  return (
    <FlatListScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.providerRowWrap,
          {
            backgroundColor: surfaceBg,
            borderColor: surfaceBorder,
          },
        ]}
      >
        <View style={styles.providerRow}>
          <ProviderButton
            active={provider === "google"}
            label={t("customer360.mail.providers.google")}
            activeColor="#4285F4"
            defaultBg={colors.card}
            defaultBorder={colors.cardBorder}
            defaultText={colors.text}
            onPress={() => {
              setProvider("google");
              setPageNumber(1);
            }}
          />

          <ProviderButton
            active={provider === "outlook"}
            label={t("customer360.mail.providers.outlook")}
            activeColor="#0078D4"
            defaultBg={colors.card}
            defaultBorder={colors.cardBorder}
            defaultText={colors.text}
            onPress={() => {
              setProvider("outlook");
              setPageNumber(1);
            }}
          />
        </View>
      </View>

      {query.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : query.isError ? (
        <View style={styles.centered}>
          <Text style={{ color: colors.error }}>{t("customer360.analytics.error")}</Text>
          <TouchableOpacity onPress={() => query.refetch()} style={styles.retryButton}>
            <Text style={{ color: colors.accent, fontWeight: "700" }}>{t("customer360.retry")}</Text>
          </TouchableOpacity>
        </View>
      ) : logs.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <View
            style={[
              styles.emptyIconWrap,
              {
                backgroundColor: surfaceBg,
                borderColor: surfaceBorder,
              },
            ]}
          >
            <Mail01Icon size={16} color={colors.textMuted} variant="stroke" />
          </View>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t("common.noData")}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {logs.map((log) => (
            <MailLogCard
              key={log.id}
              log={log}
              colors={colors}
              locale={locale}
              successText={t("customer360.mail.status.success")}
              failedText={t("customer360.mail.status.failed")}
              isDark={isDark}
            />
          ))}
        </View>
      )}

      <View
        style={[
          styles.paginationRow,
          {
            backgroundColor: surfaceBg,
            borderColor: surfaceBorder,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.paginationButton,
            {
              borderColor: colors.cardBorder,
              backgroundColor: colors.card,
              opacity: query.data?.hasPreviousPage ? 1 : 0.5,
            },
          ]}
          onPress={() => setPageNumber((prev) => Math.max(1, prev - 1))}
          disabled={!query.data?.hasPreviousPage}
        >
          <ArrowLeft01Icon size={14} color={query.data?.hasPreviousPage ? colors.text : colors.textMuted} variant="stroke" />
          <Text style={{ color: query.data?.hasPreviousPage ? colors.text : colors.textMuted }}>
            {t("common.back")}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.pageText, { color: colors.textMuted }]}>
          {query.data?.pageNumber ?? pageNumber} / {query.data?.totalPages ?? 1}
        </Text>

        <TouchableOpacity
          style={[
            styles.paginationButton,
            {
              borderColor: colors.cardBorder,
              backgroundColor: colors.card,
              opacity: query.data?.hasNextPage ? 1 : 0.5,
            },
          ]}
          onPress={() => setPageNumber((prev) => prev + 1)}
          disabled={!query.data?.hasNextPage}
        >
          <Text style={{ color: query.data?.hasNextPage ? colors.text : colors.textMuted }}>
            {t("common.next")}
          </Text>
          <ArrowRight01Icon size={14} color={query.data?.hasNextPage ? colors.text : colors.textMuted} variant="stroke" />
        </TouchableOpacity>
      </View>
    </FlatListScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 108, gap: 14 },
  providerRowWrap: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 6,
  },
  providerRow: {
    flexDirection: "row",
    gap: 8,
  },
  providerButton: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  providerText: {
    fontSize: 13,
    fontWeight: "600",
  },
  centered: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  retryButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  list: {
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  mailIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  cardDate: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 4,
  },
  cardSubject: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  infoBlock: {
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  infoIconWrap: {
    width: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLine: {
    fontSize: 12,
    flex: 1,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  errorLine: {
    fontSize: 12,
    fontWeight: "500",
    color: "#EF4444",
    flex: 1,
    lineHeight: 16,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  emptyCard: {
    minHeight: 220,
    borderWidth: 1,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  emptyIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  paginationRow: {
    marginTop: 2,
    borderWidth: 1,
    borderRadius: 18,
    padding: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  paginationButton: {
    borderWidth: 1,
    borderRadius: 12,
    minWidth: 94,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    flexDirection: "row",
    gap: 6,
  },
  pageText: {
    fontSize: 12,
    fontWeight: "500",
  },
});