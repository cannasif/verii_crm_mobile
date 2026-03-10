import React, { useMemo, useCallback } from "react";
import { View, StyleSheet, ScrollView, Platform, Linking, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { API_BASE_URL } from "../../../constants/config";
import i18n from "../../../locales";
import type { CustomerDto, CustomerImageDto } from "../types";
import type { QuotationGetDto } from "../../../features/quotation/types";
import {
  Call02Icon,
  Mail01Icon,
  Globe02Icon,
  Location01Icon,
  Invoice01Icon,
  Coins01Icon,
  WhatsappIcon,
  Calendar03Icon,
  UserIcon,
  Shield02Icon,
  Contact01Icon,
  Activity01Icon,
  MapsCircle01Icon,
  AnalyticsUpIcon,
  Note01Icon,
  Image02Icon,
  Add01Icon,
  ArrowRight01Icon,
} from "hugeicons-react-native";

interface CustomerTheme {
  cardBg: string;
  borderColor: string;
  divider: string;
  text: string;
  textMute: string;
  primary: string;
  idTagBg: string;
}

const getLocale = () => {
  switch (i18n.language) {
    case "de":
      return "de-DE";
    case "en":
      return "en-US";
    default:
      return "tr-TR";
  }
};

const getInitials = (name: string) => {
  const cleaned = name?.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ ]/g, "").trim();
  if (!cleaned) return "?";
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const getAvatarColor = (name: string) => {
  const colors = ["#db2777", "#9333ea", "#2563eb", "#059669", "#d97706", "#dc2626"];
  const safeName = name?.trim() || "Customer";
  let hash = 0;
  for (let i = 0; i < safeName.length; i++) {
    hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

function formatDate(dateString?: string | null): string | null {
  if (!dateString) return null;

  const isoLike = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dateString) || /^\d{4}-\d{2}-\d{2}$/.test(dateString);
  const date = isoLike ? new Date(dateString) : new Date(Date.parse(dateString));

  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString(getLocale(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value?: number | null): string | null {
  if (value === undefined || value === null) return null;
  return new Intl.NumberFormat(getLocale(), { style: "currency", currency: "TRY" }).format(value);
}

function formatQuotationDate(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(getLocale(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatQuotationCurrency(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(getLocale(), {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${new Intl.NumberFormat(getLocale(), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)} ${currencyCode}`;
  }
}

function getQuotationStatusMeta(status?: number | null) {
  switch (status) {
    case 1:
      return { label: "Beklemede", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.24)" };
    case 2:
      return { label: "Onaylandı", color: "#10B981", bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.24)" };
    case 3:
      return { label: "Reddedildi", color: "#EF4444", bg: "rgba(239, 68, 68, 0.12)", border: "rgba(239, 68, 68, 0.24)" };
    default:
      return { label: "Başlamadı", color: "#94A3B8", bg: "rgba(148, 163, 184, 0.12)", border: "rgba(148, 163, 184, 0.24)" };
  }
}

function toAbsoluteImageUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

async function openUrlSafely(url: string) {
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  } catch {}
}

function normalizePhoneForWhatsApp(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("90")) return digits;
  if (digits.startsWith("0")) return `9${digits}`;
  return digits;
}

function getNoteAuthor(customer: CustomerDto, t: (key: string) => string): string {
  if (!customer?.notes?.trim()) {
    return t("customer.systemUser");
  }

  const hasUpdatedInfo = !!customer.updatedByFullUser?.trim() && !!customer.updatedDate;

  if (hasUpdatedInfo) {
    return customer.updatedByFullUser!.trim();
  }

  if (customer.createdByFullUser?.trim()) {
    return customer.createdByFullUser.trim();
  }

  return t("customer.systemUser");
}

function getNoteDate(customer: CustomerDto): string | null {
  if (!customer?.notes?.trim()) return null;
  return customer.updatedDate || customer.createdDate || null;
}

interface ActionButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  color: string;
  disabled?: boolean;
}

function ActionButton({ icon, onPress, color, disabled }: ActionButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.actionCircle,
        {
          backgroundColor: color + "12",
          borderColor: color + "30",
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      {icon}
    </TouchableOpacity>
  );
}

interface DetailRowProps {
  label: string;
  value: string | number | undefined | null;
  icon?: React.ReactNode;
  theme: CustomerTheme;
  isLast?: boolean;
}

function DetailRow({ label, value, icon, theme, isLast }: DetailRowProps) {
  const hasValue = value !== undefined && value !== null && String(value).trim() !== "";
  const displayValue = hasValue ? String(value) : i18n.t("customer.unspecified");

  return (
    <View style={[styles.detailRow, !isLast && { borderBottomColor: theme.divider, borderBottomWidth: 1 }]}>
      <View style={styles.detailLabelRow}>
        {icon && <View style={styles.miniIconWrapper}>{icon}</View>}
        <Text style={[styles.detailLabel, { color: theme.textMute }]}>{label}</Text>
      </View>
      <Text
        style={[
          styles.detailValue,
          {
            color: hasValue ? theme.text : theme.textMute,
            fontStyle: hasValue ? "normal" : "italic",
          },
        ]}
      >
        {displayValue}
      </Text>
    </View>
  );
}

interface StatusBadgeProps {
  isCompleted: boolean;
  completedText: string;
  pendingText: string;
}

function StatusBadge({ isCompleted, completedText, pendingText }: StatusBadgeProps) {
  const color = isCompleted ? "#10B981" : "#EF4444";
  return (
    <View style={[styles.statusBadge, { backgroundColor: color + "15", borderColor: color + "30" }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{isCompleted ? completedText : pendingText}</Text>
    </View>
  );
}

interface CustomerDetailContentProps {
  customer: CustomerDto;
  images: CustomerImageDto[];
  quotations?: QuotationGetDto[];
  isQuotationLoading?: boolean;
  isUploadingImage: boolean;
  isUpdatingLocation?: boolean;
  insets: { bottom: number };
  t: (key: string) => string;
  on360Press: () => void;
  onQuickQuotationPress: () => void;
  onAddImagePress: () => void;
  onUpdateLocationPress?: () => void;
  onQuotationPress?: (quotationId: number) => void;
  onViewAllQuotationsPress?: () => void;
}

export function CustomerDetailContent({
  customer,
  images,
  quotations = [],
  isQuotationLoading = false,
  isUploadingImage,
  isUpdatingLocation = false,
  insets,
  t,
  on360Press,
  onQuickQuotationPress,
  onAddImagePress,
  onUpdateLocationPress = () => {},
  onQuotationPress = () => {},
  onViewAllQuotationsPress = () => {},
}: CustomerDetailContentProps): React.ReactElement {
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  const safeCustomerName = customer?.name?.trim() || t("customer.unnamedCustomer");
  const initials = getInitials(safeCustomerName);
  const avatarColor = getAvatarColor(safeCustomerName);

  const mainBg = isDark ? "#0c0516" : "#FFFFFF";
  const gradientColors = (isDark
    ? ["rgba(236, 72, 153, 0.12)", "transparent", "rgba(249, 115, 22, 0.12)"]
    : ["rgba(255, 240, 225, 0.6)", "#FFFFFF", "rgba(255, 240, 225, 0.6)"]) as [string, string, ...string[]];

  const theme = useMemo<CustomerTheme>(
    () => ({
      cardBg: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(255, 255, 255, 0.95)",
      borderColor: isDark ? "rgba(219, 39, 119, 0.2)" : "rgba(219, 39, 119, 0.3)",
      divider: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
      text: isDark ? "#FFFFFF" : "#0F172A",
      textMute: isDark ? "rgba(255, 255, 255, 0.5)" : "#64748B",
      primary: "#db2777",
      idTagBg: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
    }),
    [isDark]
  );

  const visibleImages = useMemo(() => images.filter((item) => !!toAbsoluteImageUrl(item.imageUrl)), [images]);

  const handleMapOpen = useCallback(async () => {
    if (!customer?.address && !customer?.cityName) return;
    const address = `${customer?.address || ""} ${customer?.cityName || ""}`.trim();
    if (!address) return;

    const query = encodeURIComponent(address);
    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://www.google.com/maps/search/?api=1&query=${query}`,
    });

    if (url) {
      await openUrlSafely(url);
    }
  }, [customer?.address, customer?.cityName]);

  const handleCallPress = useCallback(async () => {
    if (!customer?.phone?.trim()) return;
    await openUrlSafely(`tel:${customer.phone}`);
  }, [customer?.phone]);

  const handleMailPress = useCallback(async () => {
    if (!customer?.email?.trim()) return;
    await openUrlSafely(`mailto:${customer.email}`);
  }, [customer?.email]);

  const handleWhatsAppPress = useCallback(async () => {
    const phone = normalizePhoneForWhatsApp(customer?.phone);
    if (!phone) return;
    await openUrlSafely(`https://wa.me/${phone}`);
  }, [customer?.phone]);

  const noteDate = getNoteDate(customer);

  return (
    <View style={[styles.container, { backgroundColor: mainBg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.profileCard, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
          <View style={[styles.avatarWrapper, { borderColor: `${avatarColor}40` }]}>
            <LinearGradient colors={[`${avatarColor}40`, `${avatarColor}10`]} style={styles.avatarInner}>
              <Text style={[styles.avatarText, { color: avatarColor }]}>{initials}</Text>
            </LinearGradient>
          </View>

          <View style={styles.kunyeInfo}>
            <Text style={[styles.customerNameLarge, { color: theme.text }]}>{safeCustomerName}</Text>

            <View style={[styles.idTagCentered, { backgroundColor: theme.idTagBg }]}>
              <Text style={styles.codeTagTextLarge}>#{customer?.customerCode || "---"}</Text>
            </View>

            <TouchableOpacity
              style={[styles.btn360, { backgroundColor: theme.primary + "12", borderColor: theme.primary + "30" }]}
              onPress={on360Press}
              activeOpacity={0.7}
            >
              <AnalyticsUpIcon size={18} color={theme.primary} variant="stroke" strokeWidth={2.5} />
              <Text style={[styles.text360, { color: theme.primary }]}>{t("customer.view360")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnQuickQuotation, { backgroundColor: "#0ea5e912", borderColor: "#0ea5e940" }]}
              onPress={onQuickQuotationPress}
              activeOpacity={0.7}
            >
              <Text style={[styles.textQuickQuotation, { color: "#0ea5e9" }]}>{t("customer.quickQuotation")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnAddImage, { backgroundColor: "#22c55e12", borderColor: "#22c55e40" }]}
              onPress={onAddImagePress}
              activeOpacity={0.7}
              disabled={isUploadingImage}
            >
              {isUploadingImage ? (
                <ActivityIndicator size="small" color="#22c55e" />
              ) : (
                <Add01Icon size={18} color="#22c55e" variant="stroke" />
              )}
              <Text style={[styles.textAddImage, { color: "#22c55e" }]}>{t("customer.addImage")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnUpdateLocation, { backgroundColor: "#f59e0b12", borderColor: "#f59e0b40" }]}
              onPress={onUpdateLocationPress}
              activeOpacity={0.7}
              disabled={isUpdatingLocation}
            >
              {isUpdatingLocation ? (
                <ActivityIndicator size="small" color="#f59e0b" />
              ) : (
                <Location01Icon size={18} color="#f59e0b" variant="stroke" />
              )}
              <Text style={[styles.textUpdateLocation, { color: "#f59e0b" }]}>
                Konumu Al ve Kaydet
              </Text>
            </TouchableOpacity>

            <View style={styles.quickActionsRow}>
              <ActionButton
                color="#6366f1"
                icon={<Call02Icon size={22} color="#6366f1" variant="stroke" />}
                onPress={handleCallPress}
                disabled={!customer?.phone?.trim()}
              />
              <ActionButton
                color="#25D366"
                icon={<WhatsappIcon size={22} color="#25D366" variant="stroke" />}
                onPress={handleWhatsAppPress}
                disabled={!normalizePhoneForWhatsApp(customer?.phone)}
              />
              <ActionButton
                color="#3b82f6"
                icon={<Mail01Icon size={22} color="#3b82f6" variant="stroke" />}
                onPress={handleMailPress}
                disabled={!customer?.email?.trim()}
              />
              <ActionButton
                color="#ef4444"
                icon={<MapsCircle01Icon size={22} color="#ef4444" variant="stroke" />}
                onPress={handleMapOpen}
                disabled={!customer?.address?.trim() && !customer?.cityName?.trim()}
              />
            </View>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
          <View style={[styles.sectionHeader, styles.sectionHeaderSpaced]}>
            <View style={styles.sectionHeaderLeft}>
              <Image02Icon size={18} color={theme.primary} variant="stroke" />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("customer.images")}</Text>
            </View>
            <TouchableOpacity onPress={onAddImagePress} disabled={isUploadingImage} style={styles.inlineAction}>
              <Text style={[styles.inlineActionText, { color: "#22c55e" }]}>
                {isUploadingImage ? t("customer.uploadingImage") : t("customer.addImage")}
              </Text>
            </TouchableOpacity>
          </View>

          {visibleImages.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageScrollContent}>
              {visibleImages.map((item) => {
                const imageUri = toAbsoluteImageUrl(item.imageUrl);
                if (!imageUri) return null;

                return (
                  <View key={item.id} style={[styles.imageCard, { borderColor: theme.divider, backgroundColor: theme.cardBg }]}>
                    <Image source={{ uri: imageUri }} style={styles.customerImage} resizeMode="cover" />
                    <Text style={[styles.imageCaption, { color: theme.textMute }]}>
                      {item.imageDescription?.trim() || t("customer.imageDefaultDescription")}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={[styles.notesText, { color: theme.textMute, fontStyle: "italic" }]}>{t("customer.noImages")}</Text>
          )}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
          <View style={styles.sectionHeader}>
            <Contact01Icon size={18} color={theme.primary} variant="stroke" />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("customer.contactInfo")}</Text>
          </View>
          <DetailRow theme={theme} label={t("customer.phone")} value={customer?.phone} icon={<Call02Icon size={14} color={theme.textMute} />} />
          <DetailRow theme={theme} label={t("customer.email")} value={customer?.email} icon={<Mail01Icon size={14} color={theme.textMute} />} />
          <DetailRow theme={theme} label={t("customer.website")} value={customer?.website} icon={<Globe02Icon size={14} color={theme.textMute} />} isLast />
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
          <View style={styles.sectionHeader}>
            <Location01Icon size={18} color={theme.primary} variant="stroke" />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("customer.addressAndLocation")}</Text>
          </View>
          <Text
            style={[
              styles.addressText,
              {
                color: customer?.address?.trim() ? theme.text : theme.textMute,
                fontStyle: customer?.address?.trim() ? "normal" : "italic",
              },
            ]}
          >
            {customer?.address?.trim() || t("customer.addressNotSpecified")}
          </Text>
          <View style={[styles.locationGrid, { borderTopColor: theme.divider }]}>
            <View style={styles.locItem}>
              <Text style={[styles.gridLabel, { color: theme.textMute }]}>{t("customer.cityDistrict")}</Text>
              <Text style={[styles.gridValue, { color: theme.text }]}>
                {(customer?.cityName || "---") + " / " + (customer?.districtName || "---")}
              </Text>
            </View>
            <View style={styles.locItem}>
              <Text style={[styles.gridLabel, { color: theme.textMute }]}>{t("lookup.country")}</Text>
              <Text style={[styles.gridValue, { color: theme.text }]}>{customer?.countryName || t("customer.unspecified")}</Text>
            </View>
          </View>
        </View>

        <View style={styles.gridRow}>
          <View style={[styles.gridCard, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
            <Coins01Icon size={20} color="#10B981" style={{ marginBottom: 8 }} variant="stroke" />
            <Text style={[styles.gridLabel, { color: theme.textMute }]}>{t("customer.creditLimit")}</Text>
            <Text style={[styles.gridValue, { color: customer?.creditLimit != null ? "#10B981" : theme.textMute, fontSize: 16 }]}>
              {customer?.creditLimit != null ? formatCurrency(customer.creditLimit) : t("customer.unspecified")}
            </Text>
          </View>
          <View style={[styles.gridCard, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
            <Invoice01Icon size={20} color={theme.primary} style={{ marginBottom: 8 }} variant="stroke" />
            <Text style={[styles.gridLabel, { color: theme.textMute }]}>{t("customer.taxNumber")}</Text>
            <Text style={[styles.gridValue, { color: theme.text, fontSize: 16 }]}>{customer?.taxNumber || t("customer.unspecified")}</Text>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
          <View style={[styles.sectionHeader, styles.sectionHeaderSpaced]}>
            <View style={styles.sectionHeaderLeft}>
              <Invoice01Icon size={18} color={theme.primary} variant="stroke" />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Son Teklifler</Text>
            </View>

            <TouchableOpacity onPress={onViewAllQuotationsPress} style={styles.inlineAction}>
              <View style={styles.inlineActionRow}>
                <Text style={[styles.inlineActionText, { color: theme.primary }]}>Tümü</Text>
                <ArrowRight01Icon size={14} color={theme.primary} variant="stroke" />
              </View>
            </TouchableOpacity>
          </View>

          {isQuotationLoading ? (
            <View style={styles.quotationLoadingWrap}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : quotations.length > 0 ? (
            <ScrollView
              style={styles.quotationScrollArea}
              contentContainerStyle={styles.quotationScrollContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {quotations.map((quotation) => {
                const statusMeta = getQuotationStatusMeta(quotation.status);

                return (
                  <TouchableOpacity
                    key={quotation.id}
                    activeOpacity={0.72}
                    onPress={() => onQuotationPress(quotation.id)}
                    style={[styles.quotationMiniCard, { borderColor: theme.divider, backgroundColor: theme.cardBg }]}
                  >
                    <View style={styles.quotationMiniTopRow}>
                      <View style={styles.quotationMiniLeft}>
                        <Text style={[styles.quotationMiniOfferNo, { color: theme.text }]}>
                          {quotation.offerNo || `#${quotation.id}`}
                        </Text>
                        <Text style={[styles.quotationMiniDate, { color: theme.textMute }]}>
                          {formatQuotationDate(quotation.offerDate)}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.quotationStatusBadge,
                          {
                            backgroundColor: statusMeta.bg,
                            borderColor: statusMeta.border,
                          },
                        ]}
                      >
                        <Text style={[styles.quotationStatusText, { color: statusMeta.color }]}>
                          {statusMeta.label}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.quotationMiniBottomRow}>
                      <Text style={[styles.quotationMiniCurrency, { color: theme.textMute }]}>
                        {quotation.currency}
                      </Text>
                      <Text style={[styles.quotationMiniTotal, { color: theme.text }]}>
                        {formatQuotationCurrency(quotation.grandTotal, quotation.currency)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={[styles.notesText, { color: theme.textMute, fontStyle: "italic" }]}>
              Bu müşteriye ait teklif bulunmuyor.
            </Text>
          )}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
          <View style={styles.sectionHeader}>
            <Note01Icon size={18} color="#F59E0B" variant="stroke" />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t("customer.notesSection")}
            </Text>
          </View>

          <View style={[styles.notePaper, { borderColor: theme.divider }]}>
            <Text style={[styles.noteQuoteMark, { color: theme.textMute }]}>{`“`}</Text>

            <Text
              style={[
                styles.notesText,
                styles.notePaperText,
                {
                  color: customer?.notes ? theme.text : theme.textMute,
                  fontStyle: customer?.notes ? "normal" : "italic",
                },
              ]}
            >
              {customer?.notes || t("customer.noNotes")}
            </Text>

            {customer?.notes ? (
              <View style={[styles.noteMetaLine, { borderTopColor: theme.divider }]}>
                <View style={styles.noteMetaItem}>
                  <UserIcon size={12} color={theme.textMute} />
                  <Text style={[styles.noteMetaText, { color: theme.textMute }]}>
                    {getNoteAuthor(customer, t)}
                  </Text>
                </View>

                {noteDate ? (
                  <View style={styles.noteMetaItem}>
                    <Calendar03Icon size={12} color={theme.textMute} />
                    <Text style={[styles.noteMetaText, { color: theme.textMute }]}>
                      {formatDate(noteDate)}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
          <View style={styles.sectionHeader}>
            <Activity01Icon size={18} color={theme.primary} variant="stroke" />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("customer.systemStatus")}</Text>
          </View>
          <View style={styles.statusContainer}>
            <StatusBadge
              isCompleted={!!customer?.isCompleted}
              completedText={t("customer.statusCompleted")}
              pendingText={t("customer.statusPending")}
            />
            {customer?.isPendingApproval && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingText}>{t("customer.pendingApproval")}</Text>
              </View>
            )}
          </View>
          <DetailRow
            theme={theme}
            label={t("customer.approvalStatus")}
            value={customer?.approvalStatus}
            icon={<Shield02Icon size={14} color={theme.textMute} />}
            isLast
          />
        </View>

        <View style={[styles.footerCard, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
          <View style={styles.footerRow}>
            <UserIcon size={14} color={theme.textMute} />
            <Text style={[styles.footerText, { color: theme.textMute }]}>
              {t("customer.createdBy")}: <Text style={{ color: theme.text, fontWeight: "700" }}>{customer?.createdByFullUser || t("customer.systemUser")}</Text>
            </Text>
          </View>
          <View style={[styles.footerRow, { marginTop: 4 }]}>
            <Calendar03Icon size={14} color={theme.textMute} />
            <Text style={[styles.footerText, { color: theme.textMute }]}>
              {t("customer.createdAt")}: <Text style={{ color: theme.text, fontWeight: "700" }}>{formatDate(customer?.createdDate) || t("customer.unspecified")}</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, backgroundColor: "transparent" },
  profileCard: { padding: 24, borderRadius: 32, borderWidth: 1.5, alignItems: "center", marginBottom: 16 },
  sectionCard: { padding: 16, borderRadius: 24, borderWidth: 1.5, marginBottom: 12 },
  gridCard: { flex: 1, padding: 16, borderRadius: 24, borderWidth: 1.5 },
  footerCard: { padding: 16, borderRadius: 24, borderWidth: 1.5, marginTop: 12 },
  avatarWrapper: { width: 90, height: 90, borderRadius: 32, borderWidth: 1.5, overflow: "hidden", marginBottom: 16 },
  avatarInner: { flex: 1, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 32, fontWeight: "800" },
  kunyeInfo: { alignItems: "center", width: "100%" },
  customerNameLarge: { fontSize: 22, fontWeight: "800", textAlign: "center", marginBottom: 6, letterSpacing: -0.5 },
  idTagCentered: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, marginBottom: 14 },
  btn360: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  text360: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  btnQuickQuotation: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  textQuickQuotation: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  btnAddImage: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  textAddImage: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  btnUpdateLocation: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  textUpdateLocation: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  codeTagTextLarge: { color: "#AAA", fontSize: 13, fontWeight: "700", letterSpacing: 1 },
  quickActionsRow: { flexDirection: "row", gap: 18, justifyContent: "center", width: "100%" },
  actionCircle: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  sectionHeaderSpaced: { justifyContent: "space-between" },
  sectionHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: "800", letterSpacing: 0.5 },
  inlineAction: { paddingVertical: 4, paddingHorizontal: 2 },
  inlineActionText: { fontSize: 12, fontWeight: "700" },
  inlineActionRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  detailLabelRow: { flexDirection: "row", alignItems: "center" },
  miniIconWrapper: { marginRight: 8, opacity: 0.7 },
  detailLabel: { fontSize: 13, fontWeight: "500" },
  detailValue: { fontSize: 13, fontWeight: "700", maxWidth: "60%", textAlign: "right" },
  addressText: { fontSize: 14, lineHeight: 22, marginBottom: 12, opacity: 0.9 },
  locationGrid: { flexDirection: "row", gap: 12, paddingTop: 10, borderTopWidth: 1 },
  locItem: { flex: 1 },
  gridRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  gridLabel: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
  gridValue: { fontWeight: "800" },
  imageScrollContent: { gap: 12, paddingRight: 6 },
  imageCard: { width: 190, borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  customerImage: { width: "100%", height: 150, backgroundColor: "rgba(0,0,0,0.08)" },
  imageCaption: { fontSize: 12, lineHeight: 18, paddingHorizontal: 10, paddingVertical: 10 },
  notesText: { fontSize: 14, lineHeight: 24, opacity: 0.9 },
  notePaper: {
    position: "relative",
    borderRadius: 16,
    borderWidth: 1,
    paddingTop: 18,
    paddingHorizontal: 14,
    paddingBottom: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  noteQuoteMark: {
    position: "absolute",
    top: 6,
    left: 12,
    fontSize: 26,
    lineHeight: 26,
    fontWeight: "700",
    opacity: 0.22,
  },
  notePaperText: {
    paddingLeft: 8,
    paddingRight: 4,
    paddingTop: 6,
    paddingBottom: 2,
    lineHeight: 26,
    letterSpacing: 0.1,
  },
  noteMetaLine: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  noteMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  noteMetaText: {
    fontSize: 11,
    fontWeight: "600",
  },
  quotationLoadingWrap: {
    minHeight: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  quotationScrollArea: {
    maxHeight: 320,
  },
  quotationScrollContent: {
    gap: 10,
    paddingRight: 4,
  },
  quotationMiniCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  quotationMiniTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  quotationMiniLeft: {
    flex: 1,
  },
  quotationMiniOfferNo: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 4,
  },
  quotationMiniDate: {
    fontSize: 11,
    fontWeight: "500",
  },
  quotationStatusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  quotationStatusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  quotationMiniBottomRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quotationMiniCurrency: {
    fontSize: 11,
    fontWeight: "600",
  },
  quotationMiniTotal: {
    fontSize: 14,
    fontWeight: "800",
  },
  statusContainer: { flexDirection: "row", gap: 8, marginBottom: 12 },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },
  pendingBadge: { backgroundColor: "rgba(245, 158, 11, 0.1)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  pendingText: { color: "#F59E0B", fontSize: 11, fontWeight: "700" },
  footerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  footerText: { fontSize: 12, fontWeight: "500" },
});
