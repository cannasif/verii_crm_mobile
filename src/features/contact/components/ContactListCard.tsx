import React, { memo, useCallback, useMemo } from "react";
import { View, TouchableOpacity, StyleSheet, Linking, Platform, Text as RNText } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { LinearGradient } from "expo-linear-gradient";
import type { ContactDto } from "../types";

import {
  Call02Icon,
  Mail01Icon,
  Building03Icon,
  Briefcase02Icon,
  ArrowRight01Icon,
} from "hugeicons-react-native";

interface ContactListCardProps {
  contact: ContactDto;
  onPress: () => void;
}

const BRAND = "#db2777";
const BRAND_LIGHT = "#ec4899";

function getInitials(name: string | undefined): string {
  if (!name?.trim()) return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function ContactListCardComponent({ contact, onPress }: ContactListCardProps): React.ReactElement {
  const { t } = useTranslation();
  const { colors, themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  const cardBg = isDark ? "rgba(255, 255, 255, 0.04)" : "#FFFFFF";
  const borderColor = isDark ? "rgba(236, 72, 153, 0.22)" : "rgba(219, 39, 119, 0.12)";
  const companyBandBg = isDark ? "rgba(219, 39, 119, 0.14)" : "rgba(219, 39, 119, 0.07)";
  const mutedColor = isDark ? "#94A3B8" : "#64748B";
  const disabledColor = isDark ? "rgba(148, 163, 184, 0.45)" : "rgba(100, 116, 139, 0.45)";

  const phoneNumber = contact.mobile || contact.phone;
  const hasPhone = Boolean(phoneNumber?.trim());
  const hasEmail = Boolean(contact.email?.trim());
  const initials = useMemo(() => getInitials(contact.fullName), [contact.fullName]);

  const handleCall = useCallback(() => {
    if (!hasPhone || !phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`);
  }, [hasPhone, phoneNumber]);

  const handleEmail = useCallback(() => {
    if (!hasEmail || !contact.email) return;
    Linking.openURL(`mailto:${contact.email}`);
  }, [contact.email, hasEmail]);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor,
          ...(Platform.OS === "android"
            ? { elevation: isDark ? 0 : 2 }
            : isDark
              ? {}
              : {
                  shadowColor: "#db2777",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                }),
        },
      ]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={[styles.companyBand, { backgroundColor: companyBandBg }]}>
        <Building03Icon
          size={14}
          color={contact.customerName ? (isDark ? BRAND_LIGHT : BRAND) : disabledColor}
          variant="stroke"
          strokeWidth={2}
        />
        <Text
          style={[
            styles.companyText,
            { color: contact.customerName ? (isDark ? BRAND_LIGHT : BRAND) : disabledColor },
          ]}
          numberOfLines={1}
        >
          {contact.customerName || t("contact.noCompany")}
        </Text>
      </View>

      <View style={styles.body}>
        <View style={styles.identityRow}>
          <LinearGradient
            colors={isDark ? ["rgba(219, 39, 119, 0.35)", "rgba(236, 72, 153, 0.15)"] : ["#FCE7F3", "#FFF1F2"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={[styles.avatarText, { color: isDark ? BRAND_LIGHT : BRAND }]}>{initials}</Text>
          </LinearGradient>

          <View style={styles.identityContent}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {contact.fullName || t("contact.unnamed")}
            </Text>
            <View style={styles.titleRow}>
              <Briefcase02Icon size={12} color={contact.titleName ? mutedColor : disabledColor} variant="stroke" />
              <Text
                style={[
                  styles.title,
                  {
                    color: contact.titleName ? mutedColor : disabledColor,
                    fontStyle: contact.titleName ? "normal" : "italic",
                  },
                ]}
                numberOfLines={1}
              >
                {contact.titleName || t("contact.noTitle")}
              </Text>
            </View>
          </View>

          <View style={[styles.detailHint, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F8FAFC" }]}>
            <ArrowRight01Icon size={16} color={mutedColor} variant="stroke" strokeWidth={2} />
          </View>
        </View>

        <View style={[styles.actionsRow, { borderTopColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }]}>
          <TouchableOpacity
            style={[
              styles.actionPill,
              {
                backgroundColor: hasPhone
                  ? isDark
                    ? "rgba(16, 185, 129, 0.08)"
                    : "rgba(236, 253, 245, 0.7)"
                  : isDark
                    ? "rgba(255,255,255,0.02)"
                    : "#FAFAFA",
                borderColor: hasPhone
                  ? isDark
                    ? "rgba(52, 211, 153, 0.2)"
                    : "rgba(16, 185, 129, 0.15)"
                  : isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.05)",
              },
            ]}
            onPress={handleCall}
            disabled={!hasPhone}
            activeOpacity={hasPhone ? 0.7 : 1}
          >
            <Call02Icon size={14} color={hasPhone ? (isDark ? "#34D399" : "#059669") : disabledColor} variant="stroke" strokeWidth={2} />
            <View style={styles.actionTextWrap}>
              <RNText
                style={[styles.actionLabel, { color: hasPhone ? (isDark ? "#34D399" : "#059669") : disabledColor }]}
                numberOfLines={1}
              >
                {t("contact.callAction")}
              </RNText>
              <RNText
                style={[styles.actionValue, { color: hasPhone ? colors.textSecondary : disabledColor }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {hasPhone ? phoneNumber : t("contact.noPhone")}
              </RNText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionPill,
              {
                backgroundColor: hasEmail
                  ? isDark
                    ? "rgba(59, 130, 246, 0.08)"
                    : "rgba(239, 246, 255, 0.7)"
                  : isDark
                    ? "rgba(255,255,255,0.02)"
                    : "#FAFAFA",
                borderColor: hasEmail
                  ? isDark
                    ? "rgba(96, 165, 250, 0.2)"
                    : "rgba(59, 130, 246, 0.15)"
                  : isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.05)",
              },
            ]}
            onPress={handleEmail}
            disabled={!hasEmail}
            activeOpacity={hasEmail ? 0.7 : 1}
          >
            <Mail01Icon size={14} color={hasEmail ? (isDark ? "#60A5FA" : "#2563EB") : disabledColor} variant="stroke" strokeWidth={2} />
            <View style={styles.actionTextWrap}>
              <RNText
                style={[styles.actionLabel, { color: hasEmail ? (isDark ? "#60A5FA" : "#2563EB") : disabledColor }]}
                numberOfLines={1}
              >
                {t("contact.emailAction")}
              </RNText>
              <RNText
                style={[styles.actionValue, { color: hasEmail ? colors.textSecondary : disabledColor }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {hasEmail ? contact.email : t("contact.noEmail")}
              </RNText>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const ContactListCard = memo(ContactListCardComponent);

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  companyBand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  companyText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 14,
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  identityContent: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  title: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
  },
  detailHint: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 7,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  actionPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 0,
  },
  actionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.15,
    marginBottom: 2,
  },
  actionValue: {
    fontSize: 11,
    fontWeight: "500",
  },
});
