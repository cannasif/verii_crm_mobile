import React, { useMemo } from "react";
import { ActivityIndicator, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { BusinessCardOcrResult } from "../types/businessCard";
import type { BusinessCardMatchCandidate } from "../services/businessCardEntityResolutionService";
import { canTranslateBusinessCardToTurkish } from "../services/businessCardTranslationService";

type Theme = {
  cardBg: string;
  border: string;
  text: string;
  textMute: string;
  primary: string;
};

type Props = {
  visible: boolean;
  result: BusinessCardOcrResult | null;
  isScanning: boolean;
  isTranslating: boolean;
  isDark: boolean;
  theme: Theme;
  potentialMatches: BusinessCardMatchCandidate[];
  onCancel: () => void;
  onRetry: () => void;
  onConfirm: () => void;
  onTranslate: () => void;
};

export function BusinessCardReviewModal({
  visible,
  result,
  isScanning,
  isTranslating,
  isDark,
  theme,
  potentialMatches,
  onCancel,
  onRetry,
  onConfirm,
  onTranslate,
}: Props): React.ReactElement {
  const { t } = useTranslation();

  const ocrLanguageLabel = useMemo(() => {
    const locale = result?.languageProfile?.suggestedLocale;
    switch (locale) {
      case "tr":
        return t("customer.ocrLanguageTurkish");
      case "en":
        return t("customer.ocrLanguageEnglish");
      case "de":
        return t("customer.ocrLanguageGerman");
      case "ru":
        return t("customer.ocrLanguageRussian");
      default:
        return t("customer.ocrLanguageInternational");
    }
  }, [result?.languageProfile?.suggestedLocale, t]);

  const canTranslateReview = useMemo(() => canTranslateBusinessCardToTurkish(result), [result]);

  const reviewFieldLabels = useMemo(
    () => ({
      general: t("customer.ocrGeneral"),
      customerName: t("customer.name"),
      contactNameAndSurname: t("customer.contactPerson"),
      title: t("customer.contactTitle"),
      phone1: t("customer.phone"),
      phone2: t("customer.phone2"),
      email: t("customer.email"),
      website: t("customer.website"),
      address: t("customer.address"),
    }),
    [t]
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={onCancel} />
        <View style={[styles.ocrReviewContent, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[styles.ocrReviewTitle, { color: theme.text }]}>{t("customer.ocrReviewTitle")}</Text>
          <Text style={[styles.ocrReviewSubtitle, { color: theme.textMute }]}>{t("customer.ocrReviewSubtitle")}</Text>

          {result?.languageProfile ? (
            <View
              style={[
                styles.ocrLanguageCard,
                { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F8FAFC", borderColor: theme.border },
              ]}
            >
              <View style={styles.ocrLanguageHeader}>
                <Text style={[styles.ocrConfidenceTitle, { color: theme.text }]}>{t("customer.ocrDetectedLanguage")}</Text>
                <Text style={[styles.ocrLanguageBadge, { color: theme.primary, backgroundColor: `${theme.primary}14` }]}>
                  {ocrLanguageLabel}
                </Text>
              </View>
              <Text style={[styles.ocrLanguageHint, { color: theme.textMute }]}>
                {result.translationMeta?.translated ? t("customer.ocrTranslatedSummary") : t("customer.ocrTranslationHint")}
              </Text>
              {canTranslateReview ? (
                <TouchableOpacity
                  style={[styles.ocrTranslateBtn, { borderColor: theme.primary, backgroundColor: `${theme.primary}12` }]}
                  onPress={onTranslate}
                  disabled={isScanning || isTranslating}
                >
                  {isTranslating ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <Text style={[styles.ocrTranslateText, { color: theme.primary }]}>{t("customer.ocrTranslateToTurkish")}</Text>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {result?.review ? (
            <View
              style={[
                styles.ocrConfidenceCard,
                { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F8FAFC", borderColor: theme.border },
              ]}
            >
              <Text style={[styles.ocrConfidenceTitle, { color: theme.text }]}>
                {t("customer.ocrConfidenceTitle", { score: result.review.overallConfidence })}
              </Text>
              {result.review.flags.length > 0 ? (
                <View style={styles.ocrFlagList}>
                  {result.review.flags.slice(0, 4).map((flag, index) => (
                    <Text key={`${flag.field}-${index}`} style={[styles.ocrFlagText, { color: flag.severity === "high" ? "#ef4444" : theme.textMute }]}>
                      • {reviewFieldLabels[flag.field]}: {flag.reason}
                    </Text>
                  ))}
                </View>
              ) : (
                <Text style={[styles.ocrFlagText, { color: theme.textMute }]}>{t("customer.ocrNoFlagMessage")}</Text>
              )}
            </View>
          ) : null}

          {potentialMatches.length > 0 ? (
            <View style={[styles.ocrConfidenceCard, { backgroundColor: isDark ? "rgba(251,191,36,0.08)" : "#FFF7ED", borderColor: "#f59e0b" }]}>
              <Text style={[styles.ocrConfidenceTitle, { color: theme.text }]}>
                {t("customer.ocrPotentialMatchesTitle", { count: potentialMatches.length })}
              </Text>
              <View style={styles.ocrFlagList}>
                {potentialMatches.slice(0, 3).map((match) => (
                  <Text key={match.customer.id} style={[styles.ocrFlagText, { color: theme.textMute }]}>
                    • {match.customer.name} ({match.score}) - {match.reasons.join(", ")}
                  </Text>
                ))}
              </View>
            </View>
          ) : null}

          {result?.imageUri ? <Image source={{ uri: result.imageUri }} style={styles.ocrPreviewImage} resizeMode="cover" /> : null}

          <View style={styles.ocrFieldsWrap}>
            {([
              ["customerName", result?.customerName || "-"],
              ["contactNameAndSurname", result?.contactNameAndSurname || "-"],
              ["title", result?.title || "-"],
              ["phone1", result?.phone1 || "-"],
              ["phone2", result?.phone2 || "-"],
              ["email", result?.email || "-"],
              ["website", result?.website || "-"],
              ["address", result?.address || "-"],
            ] as const).map(([field, value]) => {
              const confidence = result?.review?.fieldConfidence[field];
              const isLowConfidence = typeof confidence === "number" && confidence < 70;
              return (
                <Text key={field} style={[styles.ocrFieldLine, { color: isLowConfidence ? "#ef4444" : theme.text }]}>
                  {reviewFieldLabels[field]}: {value}
                  {typeof confidence === "number" ? ` (${confidence}%)` : ""}
                </Text>
              );
            })}
          </View>

          <View style={styles.ocrActionRow}>
            <TouchableOpacity
              style={[styles.ocrActionBtn, { borderColor: theme.border, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#f8fafc" }]}
              onPress={onCancel}
              disabled={isScanning}
            >
              <Text style={[styles.ocrActionText, { color: theme.text }]}>{t("common.cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ocrActionBtn, { borderColor: theme.primary, backgroundColor: `${theme.primary}14` }]}
              onPress={onRetry}
              disabled={isScanning}
            >
              {isScanning ? <ActivityIndicator size="small" color={theme.primary} /> : <Text style={[styles.ocrActionText, { color: theme.primary }]}>{t("common.retry")}</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ocrActionBtn, { borderColor: theme.primary, backgroundColor: theme.primary }]}
              onPress={onConfirm}
              disabled={isScanning}
            >
              <Text style={[styles.ocrActionText, { color: "#ffffff" }]}>{t("common.confirm")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  ocrReviewContent: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  ocrReviewTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  ocrReviewSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  ocrLanguageCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  ocrLanguageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  ocrLanguageBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "700",
  },
  ocrLanguageHint: {
    fontSize: 12,
    lineHeight: 18,
  },
  ocrTranslateBtn: {
    alignSelf: "flex-start",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ocrTranslateText: {
    fontSize: 12,
    fontWeight: "700",
  },
  ocrConfidenceCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  ocrConfidenceTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  ocrFlagList: {
    gap: 4,
  },
  ocrFlagText: {
    fontSize: 12,
    lineHeight: 18,
  },
  ocrPreviewImage: {
    width: "100%",
    height: 120,
    borderRadius: 14,
  },
  ocrFieldsWrap: {
    gap: 6,
  },
  ocrFieldLine: {
    fontSize: 13,
    lineHeight: 19,
  },
  ocrActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  ocrActionBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  ocrActionText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
