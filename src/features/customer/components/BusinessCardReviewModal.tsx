import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
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
  allowRetry?: boolean;
  onCancel: () => void;
  onRetry: () => void;
  onConfirm: (result: BusinessCardOcrResult) => void;
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
  allowRetry = true,
  onCancel,
  onRetry,
  onConfirm,
  onTranslate,
}: Props): React.ReactElement {
  const { t } = useTranslation();
  const [draftResult, setDraftResult] = useState<BusinessCardOcrResult | null>(result);
  const [editingField, setEditingField] = useState<keyof BusinessCardOcrResult | null>(null);

  useEffect(() => {
    setDraftResult(result);
    setEditingField(null);
  }, [result, visible]);

  const ocrLanguageLabel = useMemo(() => {
    const locale = draftResult?.languageProfile?.suggestedLocale;
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
  }, [draftResult?.languageProfile?.suggestedLocale, t]);

  const canTranslateReview = useMemo(() => canTranslateBusinessCardToTurkish(draftResult), [draftResult]);
  const draftReview = draftResult?.review;

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
          <ScrollView
            style={styles.ocrScroll}
            contentContainerStyle={styles.ocrScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.ocrReviewTitle, { color: theme.text }]}>{t("customer.ocrReviewTitle")}</Text>
            <Text style={[styles.ocrReviewSubtitle, { color: theme.textMute }]}>{t("customer.ocrReviewSubtitle")}</Text>

            {draftResult?.previewUri ? <Image source={{ uri: draftResult.previewUri }} style={styles.ocrPreviewImage} resizeMode="cover" /> : null}

            {draftResult?.languageProfile ? (
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
                  {draftResult.translationMeta?.translated ? t("customer.ocrTranslatedSummary") : t("customer.ocrTranslationHint")}
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

            {draftReview ? (
              <View
                style={[
                  styles.ocrConfidenceCard,
                  { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F8FAFC", borderColor: theme.border },
                ]}
              >
                <Text style={[styles.ocrConfidenceTitle, { color: theme.text }]}>
                  {t("customer.ocrConfidenceTitle", { score: draftReview.overallConfidence })}
                </Text>
                {draftReview.flags.length > 0 ? (
                  <View style={styles.ocrFlagList}>
                    {draftReview.flags.slice(0, 4).map((flag, index) => (
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

            <View style={styles.ocrFieldsWrap}>
              {([
                ["customerName", draftResult?.customerName || ""],
                ["contactNameAndSurname", draftResult?.contactNameAndSurname || ""],
                ["title", draftResult?.title || ""],
                ["phone1", draftResult?.phone1 || ""],
                ["phone2", draftResult?.phone2 || ""],
                ["email", draftResult?.email || ""],
                ["website", draftResult?.website || ""],
                ["address", draftResult?.address || ""],
              ] as const).map(([field, value]) => {
                const confidence = draftReview?.fieldConfidence[field];
                const isLowConfidence = typeof confidence === "number" && confidence < 70;
                const isEditing = editingField === field;
                return (
                  <View key={field} style={styles.ocrFieldRow}>
                    <View style={styles.ocrFieldContent}>
                      <Text style={[styles.ocrFieldLabel, { color: theme.textMute }]}>{reviewFieldLabels[field]}</Text>
                      {isEditing ? (
                        <TextInput
                          value={value}
                          onChangeText={(nextValue) =>
                            setDraftResult((current) => (current ? { ...current, [field]: nextValue || undefined } : current))
                          }
                          placeholder={reviewFieldLabels[field]}
                          placeholderTextColor={theme.textMute}
                          style={[
                            styles.ocrFieldInput,
                            {
                              color: theme.text,
                              borderColor: isLowConfidence ? "#ef4444" : theme.border,
                              backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#fff",
                            },
                          ]}
                          multiline={field === "address"}
                        />
                      ) : (
                        <Text style={[styles.ocrFieldLine, { color: isLowConfidence ? "#ef4444" : theme.text }]}>
                          {value || "-"}
                          {typeof confidence === "number" ? ` (${confidence}%)` : ""}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[styles.ocrEditBtn, { borderColor: theme.border, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#f8fafc" }]}
                      onPress={() => setEditingField((current) => (current === field ? null : field))}
                      disabled={isScanning}
                    >
                      <Text style={[styles.ocrEditBtnText, { color: theme.text }]}>{t("common.edit")}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.ocrActionRow}>
            <TouchableOpacity
              style={[styles.ocrActionBtn, { borderColor: theme.border, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#f8fafc" }]}
              onPress={onCancel}
              disabled={isScanning}
            >
              <Text style={[styles.ocrActionText, { color: theme.text }]}>{t("common.cancel")}</Text>
            </TouchableOpacity>
            {allowRetry ? (
              <TouchableOpacity
                style={[styles.ocrActionBtn, { borderColor: theme.primary, backgroundColor: `${theme.primary}14` }]}
                onPress={onRetry}
                disabled={isScanning}
              >
                {isScanning ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Text style={[styles.ocrActionText, { color: theme.primary }]}>{t("customer.advancedSearch")}</Text>
                )}
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.ocrActionBtn, { borderColor: theme.primary, backgroundColor: theme.primary }]}
              onPress={() => {
                if (draftResult) onConfirm(draftResult);
              }}
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
    borderWidth: 1,
    maxHeight: "88%",
    overflow: "hidden",
  },
  ocrScroll: {
    flexGrow: 0,
  },
  ocrScrollContent: {
    padding: 16,
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
    gap: 10,
  },
  ocrFieldRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  ocrFieldContent: {
    flex: 1,
    gap: 4,
  },
  ocrFieldLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  ocrFieldLine: {
    fontSize: 13,
    lineHeight: 19,
  },
  ocrFieldInput: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    lineHeight: 18,
    textAlignVertical: "top",
  },
  ocrEditBtn: {
    minWidth: 72,
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  ocrEditBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  ocrActionRow: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
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
