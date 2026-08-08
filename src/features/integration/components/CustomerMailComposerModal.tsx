import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useUIStore } from "../../../store/ui";
import { Text } from "../../../components/ui/text";
import { useToast } from "../../../hooks/useToast";
import { integrationApi } from "../api/integration-api";
import { integrationQueryKeys } from "../utils/query-keys";

type MailProvider = "google" | "outlook";
type MailModuleKey = "demand" | "quotation" | "order" | "activity";

interface CustomerMailComposerModalProps {
  visible: boolean;
  onClose: () => void;
  provider: MailProvider;
  moduleKey: MailModuleKey;
  recordId: number;
  customerId?: number | null;
  contactId?: number | null;
  customerName?: string | null;
  contactName?: string | null;
}

type TemplateKey = "generic-info" | "follow-up" | "reminder";

export function CustomerMailComposerModal({
  visible,
  onClose,
  provider,
  moduleKey,
  recordId,
  customerId,
  contactId,
  customerName,
  contactName,
}: CustomerMailComposerModalProps): React.ReactElement {
  const { t } = useTranslation();
  const { themeMode } = useUIStore();
  const { showError, showSuccess } = useToast();
  const isDark = themeMode === "dark";

  const [templateKey, setTemplateKey] = useState<TemplateKey>("generic-info");
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isHtml, setIsHtml] = useState(false);

  const moduleLabel = useMemo(
    () => t(`mailComposer.modules.${moduleKey}`),
    [moduleKey, t]
  );

  const templates = useMemo(
    () => [
      {
        key: "generic-info" as const,
        label: t("mailComposer.templates.genericInfo"),
        build: () => ({
          subject: t("mailComposer.templateBody.generic.subject", { module: moduleLabel, id: recordId }),
          body: t("mailComposer.templateBody.generic.body", {
            module: moduleLabel,
            id: recordId,
            customer: customerName || "-",
          }),
        }),
      },
      {
        key: "follow-up" as const,
        label: t("mailComposer.templates.followUp"),
        build: () => ({
          subject: t("mailComposer.templateBody.followUp.subject", { module: moduleLabel, id: recordId }),
          body: t("mailComposer.templateBody.followUp.body", {
            module: moduleLabel,
            id: recordId,
            customer: customerName || "-",
            contact: contactName || "-",
          }),
        }),
      },
      {
        key: "reminder" as const,
        label: t("mailComposer.templates.reminder"),
        build: () => ({
          subject: t("mailComposer.templateBody.reminder.subject", { module: moduleLabel, id: recordId }),
          body: t("mailComposer.templateBody.reminder.body", {
            module: moduleLabel,
            id: recordId,
            customer: customerName || "-",
          }),
        }),
      },
    ],
    [t, moduleLabel, recordId, customerName, contactName]
  );

  const missingCustomer = !customerId || customerId <= 0;
  const selectedTemplate = templates.find((x) => x.key === templateKey) ?? templates[0];

  const statusQuery = useQuery({
    queryKey: integrationQueryKeys.status(provider),
    queryFn: provider === "google" ? integrationApi.getGoogleStatus : integrationApi.getOutlookStatus,
    enabled: visible,
  });

  const isConnected = statusQuery.data?.isConnected === true;

  useEffect(() => {
    if (!visible) return;
    const initial = selectedTemplate.build();
    setTo("");
    setCc("");
    setBcc("");
    setSubject(initial.subject);
    setBody(initial.body);
    setIsHtml(false);
  }, [visible, selectedTemplate]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        customerId: Number(customerId),
        contactId: contactId && contactId > 0 ? Number(contactId) : undefined,
        to: to.trim() || undefined,
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
        subject: subject.trim(),
        body,
        isHtml,
        templateKey,
        templateName: selectedTemplate.label,
        templateVersion: "v1",
      };

      if (provider === "google") {
        return integrationApi.sendGoogleCustomerMail(payload);
      }

      return integrationApi.sendOutlookCustomerMail(payload);
    },
    onSuccess: () => {
      showSuccess(
        provider === "google"
          ? t("mailComposer.googleSendSuccess")
          : t("mailComposer.outlookSendSuccess")
      );
      onClose();
    },
    onError: (error) => {
      showError(
        error instanceof Error
          ? error.message
          : provider === "google"
            ? t("mailComposer.googleSendError")
            : t("mailComposer.outlookSendError")
      );
    },
  });

  const handleTemplatePress = (next: TemplateKey): void => {
    setTemplateKey(next);
    const template = templates.find((x) => x.key === next);
    if (!template) return;
    const generated = template.build();
    setSubject(generated.subject);
    setBody(generated.body);
  };

  const handleSend = (): void => {
    if (missingCustomer) {
      showError(t("mailComposer.missingCustomer"));
      return;
    }

    if (!isConnected) {
      showError(
        provider === "google"
          ? t("mailComposer.googleNotConnected")
          : t("mailComposer.outlookNotConnected")
      );
      return;
    }

    if (!subject.trim() || !body.trim()) {
      showError(t("mailComposer.subjectBodyRequired"));
      return;
    }

    sendMutation.mutate();
  };

  const bg = isDark ? "#0f0a18" : "#FFFFFF";
  const card = isDark ? "#1a1025" : "#F8FAFC";
  const border = isDark ? "rgba(255,255,255,0.1)" : "rgba(15, 23, 42, 0.12)";
  const text = isDark ? "#F8FAFC" : "#0F172A";
  const muted = isDark ? "#94A3B8" : "#64748B";
  const providerColor = provider === "google" ? "#4285F4" : "#0078D4";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: bg, borderColor: border }]}>
          <View style={styles.header}>
            <View style={styles.headerTextWrap}>
              <Text style={[styles.title, { color: text }]}>
                {provider === "google" ? t("mailComposer.googleTitle") : t("mailComposer.outlookTitle")}
              </Text>
              <Text style={[styles.subtitle, { color: muted }]}>
                {t("mailComposer.description", { module: moduleLabel, id: recordId })}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, { borderColor: border }]}>
              <Text style={[styles.closeButtonText, { color: text }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
            {missingCustomer && (
              <View style={[styles.alert, { borderColor: "#f59e0b", backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
                <Text style={[styles.alertText, { color: "#f59e0b" }]}>{t("mailComposer.missingCustomer")}</Text>
              </View>
            )}

            {!missingCustomer && (
              <View style={[styles.alert, { borderColor: isConnected ? "#10b981" : "#ef4444", backgroundColor: isConnected ? "rgba(16, 185, 129, 0.14)" : "rgba(239, 68, 68, 0.14)" }]}>
                {statusQuery.isLoading ? (
                  <ActivityIndicator size="small" color={providerColor} />
                ) : (
                  <Text style={[styles.alertText, { color: isConnected ? "#10b981" : "#ef4444" }]}>
                    {isConnected
                      ? t("mailComposer.connected")
                      : provider === "google"
                        ? t("mailComposer.googleNotConnected")
                        : t("mailComposer.outlookNotConnected")}
                  </Text>
                )}
              </View>
            )}

            <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
              <Text style={[styles.label, { color: muted }]}>{t("mailComposer.template")}</Text>
              <View style={styles.templateRow}>
                {templates.map((template) => {
                  const selected = template.key === templateKey;
                  return (
                    <TouchableOpacity
                      key={template.key}
                      onPress={() => handleTemplatePress(template.key)}
                      style={[
                        styles.templateButton,
                        {
                          borderColor: selected ? providerColor : border,
                          backgroundColor: selected ? `${providerColor}22` : "transparent",
                        },
                      ]}
                    >
                      <Text style={{ color: selected ? providerColor : text, fontSize: 12, fontWeight: "600" }}>
                        {template.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
              <Text style={[styles.label, { color: muted }]}>{t("mailComposer.to")}</Text>
              <TextInput
                value={to}
                onChangeText={setTo}
                placeholder={t("mailComposer.autoRecipientHint")}
                placeholderTextColor={muted}
                style={[styles.input, { color: text, borderColor: border, backgroundColor: bg }]}
              />

              <Text style={[styles.label, { color: muted }]}>{t("mailComposer.cc")}</Text>
              <TextInput
                value={cc}
                onChangeText={setCc}
                placeholder={t("mailComposer.recipientPlaceholder")}
                placeholderTextColor={muted}
                style={[styles.input, { color: text, borderColor: border, backgroundColor: bg }]}
              />

              <Text style={[styles.label, { color: muted }]}>{t("mailComposer.bcc")}</Text>
              <TextInput
                value={bcc}
                onChangeText={setBcc}
                placeholder={t("mailComposer.recipientPlaceholder")}
                placeholderTextColor={muted}
                style={[styles.input, { color: text, borderColor: border, backgroundColor: bg }]}
              />
            </View>

            <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
              <Text style={[styles.label, { color: muted }]}>{t("mailComposer.subject")}</Text>
              <TextInput
                value={subject}
                onChangeText={setSubject}
                placeholder={t("mailComposer.subject")}
                placeholderTextColor={muted}
                style={[styles.input, { color: text, borderColor: border, backgroundColor: bg }]}
              />

              <Text style={[styles.label, { color: muted }]}>{t("mailComposer.body")}</Text>
              <TextInput
                value={body}
                onChangeText={setBody}
                multiline
                textAlignVertical="top"
                placeholder={t("mailComposer.body")}
                placeholderTextColor={muted}
                style={[styles.textArea, { color: text, borderColor: border, backgroundColor: bg }]}
              />

              <View style={styles.switchRow}>
                <Text style={[styles.label, { color: muted, marginBottom: 0 }]}>{t("mailComposer.isHtml")}</Text>
                <Switch value={isHtml} onValueChange={setIsHtml} trackColor={{ true: providerColor }} />
              </View>
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: border }]}>
            <TouchableOpacity onPress={onClose} style={[styles.footerButton, { borderColor: border }]}>
              <Text style={[styles.footerButtonText, { color: text }]}>{t("mailComposer.cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSend}
              disabled={sendMutation.isPending}
              style={[styles.footerButton, { backgroundColor: providerColor, borderColor: providerColor }]}
            >
              {sendMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={[styles.footerButtonText, { color: "#FFFFFF" }]}>{t("mailComposer.send")}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.65)",
    justifyContent: "flex-end",
  },
  container: {
    maxHeight: "92%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTextWrap: { flex: 1, paddingRight: 12 },
  title: { fontSize: 16, fontWeight: "700" },
  subtitle: { fontSize: 12, marginTop: 2 },
  closeButton: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: { fontSize: 14, fontWeight: "700" },
  content: { maxHeight: "75%" },
  contentInner: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  alert: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  alertText: {
    fontSize: 12,
    fontWeight: "600",
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 42,
    paddingHorizontal: 10,
    marginBottom: 10,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 130,
    paddingHorizontal: 10,
    paddingTop: 10,
    fontSize: 14,
  },
  templateRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  templateButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  switchRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
  },
  footerButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  footerButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
