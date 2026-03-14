import React, { useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  Linking,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { getApiBaseUrl } from "../../../constants/config";
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
  cardBgSoft: string;
  borderColor: string;
  divider: string;
  text: string;
  textSoft: string;
  textMute: string;
  primary: string;
  idTagBg: string;
  sectionIconBg: string;
  addressBg: string;
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

function toTitleCase(value?: string | null): string | null {
  if (!value?.trim()) return null;

  return value
    .trim()
    .toLocaleLowerCase(getLocale())
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      const firstChar = word.charAt(0).toLocaleUpperCase(getLocale());
      const rest = word.slice(1);
      return `${firstChar}${rest}`;
    })
    .join(" ");
}

function formatSalesRep(value?: string | null): string | null {
  if (!value?.trim()) return null;
  return toTitleCase(value);
}

function formatDate(dateString?: string | null): string | null {
  if (!dateString) return null;

  const isoLike =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dateString) ||
    /^\d{4}-\d{2}-\d{2}$/.test(dateString);
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

function getQuotationStatusMeta(status?: number | null, t?: (key: string) => string) {
  switch (status) {
    case 1:
      return {
        label: t ? t("quotation.status.pending") : "Beklemede",
        color: "#F59E0B",
        bg: "rgba(245, 158, 11, 0.12)",
        border: "rgba(245, 158, 11, 0.22)",
      };
    case 2:
      return {
        label: t ? t("quotation.status.approved") : "Onaylandı",
        color: "#10B981",
        bg: "rgba(16, 185, 129, 0.12)",
        border: "rgba(16, 185, 129, 0.22)",
      };
    case 3:
      return {
        label: t ? t("quotation.status.rejected") : "Reddedildi",
        color: "#EF4444",
        bg: "rgba(239, 68, 68, 0.12)",
        border: "rgba(239, 68, 68, 0.22)",
      };
    default:
      return {
        label: t ? t("quotation.status.notStarted") : "Başlamadı",
        color: "#94A3B8",
        bg: "rgba(148, 163, 184, 0.12)",
        border: "rgba(148, 163, 184, 0.22)",
      };
  }
}

function toAbsoluteImageUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalized}`;
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
  if (digits.length === 10) return `90${digits}`;
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

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  theme: CustomerTheme;
  rightElement?: React.ReactNode;
}

function SectionHeader({ icon, title, theme, rightElement }: SectionHeaderProps) {
  return (
    <View style={[styles.sectionHeader, rightElement ? styles.sectionHeaderSpaced : null]}>
      <View style={styles.sectionHeaderLeft}>
        <View style={[styles.sectionIconWrapper, { backgroundColor: theme.sectionIconBg }]}>
          {icon}
        </View>
        <Text style={[styles.sectionTitle, { color: theme.textSoft }]}>{title}</Text>
      </View>
      {rightElement}
    </View>
  );
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
          backgroundColor: color + "10",
          borderColor: color + "24",
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      {icon}
    </TouchableOpacity>
  );
}

interface QuickMiniActionProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  color: string;
  disabled?: boolean;
}

function QuickMiniAction({ icon, label, onPress, color, disabled }: QuickMiniActionProps) {
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  return (
    <TouchableOpacity
      activeOpacity={0.72}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.quickMiniAction,
        {
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.quickMiniSquare,
          {
            backgroundColor: `${color}10`,
            borderColor: `${color}22`,
          },
        ]}
      >
        {icon}
      </View>

      <Text
        unstyled
        disableThemeColor
        style={[
          styles.quickMiniLabel,
          { color: isDark ? "rgba(203,213,225,0.80)" : "rgba(100,116,139,0.84)" },
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
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
    <View
      style={[
        styles.detailRow,
        !isLast && { borderBottomColor: theme.divider, borderBottomWidth: 1 },
      ]}
    >
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
        numberOfLines={2}
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
    <View style={[styles.statusBadge, { backgroundColor: color + "12", borderColor: color + "22" }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{isCompleted ? completedText : pendingText}</Text>
    </View>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  theme: CustomerTheme;
}

function EmptyState({ icon, title, subtitle, theme }: EmptyStateProps) {
  return (
    <View style={[styles.emptyState, { borderColor: theme.divider, backgroundColor: theme.cardBgSoft }]}>
      <View style={[styles.emptyStateIconWrap, { backgroundColor: theme.sectionIconBg }]}>{icon}</View>
      <Text style={[styles.emptyStateTitle, { color: theme.textSoft }]}>{title}</Text>
      {subtitle ? <Text style={[styles.emptyStateSubtitle, { color: theme.textMute }]}>{subtitle}</Text> : null}
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
  onQuickActivityPress: () => void;
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
  onQuickActivityPress,
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
  const salesRepValue = formatSalesRep(customer?.salesRepCode) || t("customer.unspecified");

  const mainBg = isDark ? "#0c0516" : "#FFFFFF";
  const gradientColors = (
    isDark
      ? ["rgba(236, 72, 153, 0.12)", "transparent", "rgba(249, 115, 22, 0.12)"]
      : ["rgba(255, 240, 225, 0.6)", "#FFFFFF", "rgba(255, 240, 225, 0.6)"]
  ) as [string, string, ...string[]];

  const theme = useMemo<CustomerTheme>(
    () => ({
      cardBg: isDark ? "rgba(255, 255, 255, 0.045)" : "rgba(255, 255, 255, 0.96)",
      cardBgSoft: isDark ? "rgba(255,255,255,0.028)" : "rgba(15,23,42,0.024)",
      borderColor: isDark ? "rgba(219, 39, 119, 0.15)" : "rgba(219, 39, 119, 0.16)",
      divider: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(148,163,184,0.10)",
      text: isDark ? "#CBD5E1" : "#64748B",
      textSoft: isDark ? "#E2E8F0" : "#475569",
      textMute: isDark ? "rgba(148,163,184,0.76)" : "#94A3B8",
      primary: "#db2777",
      idTagBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(148,163,184,0.08)",
      sectionIconBg: isDark ? "rgba(219,39,119,0.10)" : "rgba(219,39,119,0.07)",
      addressBg: isDark ? "rgba(255,255,255,0.025)" : "rgba(15,23,42,0.022)",
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
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.borderColor,
            },
          ]}
        >
          <View style={[styles.avatarWrapper, { borderColor: `${avatarColor}30` }]}>
            <LinearGradient colors={[`${avatarColor}30`, `${avatarColor}0A`]} style={styles.avatarInner}>
              <Text style={[styles.avatarText, { color: avatarColor }]}>{initials}</Text>
            </LinearGradient>
          </View>

          <View style={styles.kunyeInfo}>
            <Text style={[styles.customerNameLarge, { color: theme.textSoft }]}>{safeCustomerName}</Text>

            <View style={[styles.idTagCentered, { backgroundColor: theme.idTagBg }]}>
              <Text style={[styles.codeTagTextLarge, { color: theme.textMute }]}>
                #{customer?.customerCode || "---"}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.btn360,
                {
                  backgroundColor: theme.primary + "10",
                  borderColor: theme.primary + "20",
                },
              ]}
              onPress={on360Press}
              activeOpacity={0.7}
            >
              <AnalyticsUpIcon size={18} color={theme.primary} variant="stroke" strokeWidth={2.1} />
              <Text style={[styles.text360, { color: theme.primary }]}>{t("customer.view360")}</Text>
            </TouchableOpacity>

            <View style={styles.quickMiniActionsRow}>
              <QuickMiniAction
                color="#0ea5e9"
                icon={<Invoice01Icon size={22} color="#0ea5e9" variant="stroke" />}
                label={t("customer.quickQuotation")}
                onPress={onQuickQuotationPress}
              />

              <QuickMiniAction
                color="#8b5cf6"
                icon={<Activity01Icon size={22} color="#8b5cf6" variant="stroke" />}
                label={t("customer.quickActivity")}
                onPress={onQuickActivityPress}
              />

              <QuickMiniAction
                color="#22c55e"
                icon={
                  isUploadingImage ? (
                    <ActivityIndicator size="small" color="#22c55e" />
                  ) : (
                    <Add01Icon size={22} color="#22c55e" variant="stroke" />
                  )
                }
                label={t("customer.addImage")}
                onPress={onAddImagePress}
                disabled={isUploadingImage}
              />

              <QuickMiniAction
                color="#f59e0b"
                icon={
                  isUpdatingLocation ? (
                    <ActivityIndicator size="small" color="#f59e0b" />
                  ) : (
                    <Location01Icon size={22} color="#f59e0b" variant="stroke" />
                  )
                }
                label={t("customer.updateLocation")}
                onPress={onUpdateLocationPress}
                disabled={isUpdatingLocation}
              />
            </View>

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
          <SectionHeader
            icon={<Image02Icon size={16} color={theme.primary} variant="stroke" />}
            title={t("customer.images")}
            theme={theme}
            rightElement={
              <TouchableOpacity onPress={onAddImagePress} disabled={isUploadingImage} style={styles.inlineAction}>
                <Text style={[styles.inlineActionText, { color: "#22c55e" }]}>
                  {isUploadingImage ? t("customer.uploadingImage") : t("customer.addImage")}
                </Text>
              </TouchableOpacity>
            }
          />

          {visibleImages.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageScrollContent}>
              {visibleImages.map((item) => {
                const imageUri = toAbsoluteImageUrl(item.imageUrl);
                if (!imageUri) return null;

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.imageCard,
                      { borderColor: theme.divider, backgroundColor: theme.cardBgSoft },
                    ]}
                  >
                    <Image source={{ uri: imageUri }} style={styles.customerImage} resizeMode="cover" />
                    <Text style={[styles.imageCaption, { color: theme.text }]}>
                      {item.imageDescription?.trim() || t("customer.imageDefaultDescription")}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <EmptyState
              theme={theme}
              icon={<Image02Icon size={18} color={theme.primary} variant="stroke" />}
              title={t("customer.noImages")}
              subtitle={t("customer.addImage")}
            />
          )}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
          <SectionHeader
            icon={<Contact01Icon size={16} color={theme.primary} variant="stroke" />}
            title={t("customer.contactInfo")}
            theme={theme}
          />
          <DetailRow
            theme={theme}
            label={t("customer.phone")}
            value={customer?.phone}
            icon={<Call02Icon size={14} color={theme.textMute} />}
          />
          <DetailRow
            theme={theme}
            label={t("customer.email")}
            value={customer?.email}
            icon={<Mail01Icon size={14} color={theme.textMute} />}
          />
          <DetailRow
            theme={theme}
            label={t("customer.website")}
            value={customer?.website}
            icon={<Globe02Icon size={14} color={theme.textMute} />}
            isLast
          />
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
          <SectionHeader
            icon={<Location01Icon size={16} color={theme.primary} variant="stroke" />}
            title={t("customer.addressAndLocation")}
            theme={theme}
          />

          <Text
            style={[
              styles.addressText,
              {
                color: customer?.address?.trim() ? theme.text : theme.textMute,
                fontStyle: customer?.address?.trim() ? "normal" : "italic",
                backgroundColor: theme.addressBg,
              },
            ]}
          >
            {customer?.address?.trim() || t("customer.addressNotSpecified")}
          </Text>

          <View style={[styles.locationGrid, { borderTopColor: theme.divider }]}>
            <View style={[styles.locItemBox, { backgroundColor: theme.cardBgSoft, borderColor: theme.divider }]}>
              <Text style={[styles.gridLabel, { color: theme.textMute }]}>{t("customer.cityDistrict")}</Text>
              <Text style={[styles.gridValue, { color: theme.textSoft }]}>
                {(customer?.cityName || "---") + " / " + (customer?.districtName || "---")}
              </Text>
            </View>
            <View style={[styles.locItemBox, { backgroundColor: theme.cardBgSoft, borderColor: theme.divider }]}>
              <Text style={[styles.gridLabel, { color: theme.textMute }]}>{t("lookup.country")}</Text>
              <Text style={[styles.gridValue, { color: theme.textSoft }]}>
                {customer?.countryName || t("customer.unspecified")}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.gridRow}>
          <View style={[styles.gridCard, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
            <Coins01Icon size={22} color="#10B981" style={{ marginBottom: 10 }} variant="stroke" />
            <Text style={[styles.gridLabel, { color: theme.textMute }]}>{t("customer.creditLimit")}</Text>
            <Text
              style={[
                styles.creditValue,
                { color: customer?.creditLimit != null ? "#10B981" : theme.textMute },
              ]}
            >
              {customer?.creditLimit != null ? formatCurrency(customer.creditLimit) : t("customer.unspecified")}
            </Text>
          </View>

          <View style={[styles.gridCard, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
            <Invoice01Icon size={22} color={theme.primary} style={{ marginBottom: 10 }} variant="stroke" />
            <Text style={[styles.gridLabel, { color: theme.textMute }]}>{t("customer.taxNumber")}</Text>
            <Text style={[styles.gridValueLarge, { color: theme.textSoft }]}>
              {customer?.taxNumber || t("customer.unspecified")}
            </Text>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
          <SectionHeader
            icon={<Invoice01Icon size={16} color={theme.primary} variant="stroke" />}
            title={t("customer.latestQuotations")}
            theme={theme}
            rightElement={
              <TouchableOpacity onPress={onViewAllQuotationsPress} style={styles.inlineAction}>
                <View style={styles.inlineActionRow}>
                  <Text style={[styles.inlineActionText, { color: theme.primary }]}>{t("common.all")}</Text>
                  <ArrowRight01Icon size={14} color={theme.primary} variant="stroke" />
                </View>
              </TouchableOpacity>
            }
          />

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
                const statusMeta = getQuotationStatusMeta(quotation.status, t);

                return (
                  <TouchableOpacity
                    key={quotation.id}
                    activeOpacity={0.72}
                    onPress={() => onQuotationPress(quotation.id)}
                    style={[
                      styles.quotationMiniCard,
                      { borderColor: theme.divider, backgroundColor: theme.cardBgSoft },
                    ]}
                  >
                    <View style={styles.quotationMiniTopRow}>
                      <View style={styles.quotationMiniLeft}>
                        <Text style={[styles.quotationMiniOfferNo, { color: theme.textSoft }]}>
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
                      <Text style={[styles.quotationMiniTotal, { color: theme.textSoft }]}>
                        {formatQuotationCurrency(quotation.grandTotal, quotation.currency)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <EmptyState
              theme={theme}
              icon={<Invoice01Icon size={18} color={theme.primary} variant="stroke" />}
              title={t("customer.noQuotations")}
              subtitle={t("common.all")}
            />
          )}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
          <SectionHeader
            icon={<Note01Icon size={16} color="#F59E0B" variant="stroke" />}
            title={t("customer.notesSection")}
            theme={theme}
          />

          <View
            style={[
              styles.notePaper,
              {
                borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(226, 191, 105, 0.32)",
                backgroundColor: isDark ? "rgba(250, 204, 21, 0.06)" : "rgba(255, 249, 219, 0.92)",
              },
            ]}
          >
            <Text
              style={[
                styles.noteQuoteMark,
                { color: isDark ? "rgba(253,224,71,0.18)" : "rgba(202,138,4,0.16)" },
              ]}
            >
              {`“`}
            </Text>

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
                  <Text style={[styles.noteMetaText, { color: theme.textMute }]}>{getNoteAuthor(customer, t)}</Text>
                </View>

                {noteDate ? (
                  <View style={styles.noteMetaItem}>
                    <Calendar03Icon size={12} color={theme.textMute} />
                    <Text style={[styles.noteMetaText, { color: theme.textMute }]}>{formatDate(noteDate)}</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={[styles.emptyStateInline, { borderTopColor: theme.divider }]}>
                <Text style={[styles.emptyStateInlineText, { color: theme.textMute }]}>{t("customer.noNotes")}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
          <SectionHeader
            icon={<Activity01Icon size={16} color={theme.primary} variant="stroke" />}
            title={t("customer.systemStatus")}
            theme={theme}
          />
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
          <Text style={[styles.footerTitle, { color: theme.textSoft }]}>Kayıt Bilgileri</Text>

          <View style={styles.footerRow}>
            <View style={[styles.footerIconWrap, { backgroundColor: theme.cardBgSoft }]}>
              <UserIcon size={14} color={theme.textMute} />
            </View>
            <Text style={[styles.footerText, { color: theme.textMute }]}>
              {t("customer.createdBy")}:{" "}
              <Text style={{ color: theme.textSoft, fontWeight: "600" }}>
                {customer?.createdByFullUser || t("customer.systemUser")}
              </Text>
            </Text>
          </View>

          <View style={[styles.footerRow, { marginTop: 8 }]}>
            <View style={[styles.footerIconWrap, { backgroundColor: theme.cardBgSoft }]}>
              <Contact01Icon size={14} color={theme.textMute} />
            </View>
            <Text style={[styles.footerText, { color: theme.textMute }]}>
              {t("customer.salesRepresentative")}:{" "}
              <Text style={{ color: theme.textSoft, fontWeight: "600" }}>{salesRepValue}</Text>
            </Text>
          </View>

          <View style={[styles.footerRow, { marginTop: 8 }]}>
            <View style={[styles.footerIconWrap, { backgroundColor: theme.cardBgSoft }]}>
              <Calendar03Icon size={14} color={theme.textMute} />
            </View>
            <Text style={[styles.footerText, { color: theme.textMute }]}>
              {t("customer.createdAt")}:{" "}
              <Text style={{ color: theme.textSoft, fontWeight: "600" }}>
                {formatDate(customer?.createdDate) || t("customer.unspecified")}
              </Text>
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

  profileCard: {
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 22,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: "center",
    marginBottom: 18,
  },

  sectionCard: {
    padding: 18,
    borderRadius: 26,
    borderWidth: 1.5,
    marginBottom: 16,
  },

  gridCard: {
    flex: 1,
    padding: 18,
    borderRadius: 24,
    borderWidth: 1.5,
  },

  footerCard: {
    padding: 18,
    borderRadius: 24,
    borderWidth: 1.5,
    marginTop: 4,
  },

  avatarWrapper: {
    width: 96,
    height: 96,
    borderRadius: 32,
    borderWidth: 2,
    overflow: "hidden",
    marginBottom: 18,
  },

  avatarInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 30,
    fontWeight: "700",
  },

  kunyeInfo: {
    alignItems: "center",
    width: "100%",
  },

  customerNameLarge: {
    fontSize: 23,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.25,
  },

  idTagCentered: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 16,
  },

  codeTagTextLarge: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.4,
    opacity: 0.88,
  },

  btn360: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 20,
    borderWidth: 1.2,
    marginBottom: 22,
  },

  text360: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.2,
  },

  quickMiniActionsRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22,
  },

  quickMiniAction: {
    width: 72,
    alignItems: "center",
  },

  quickMiniSquare: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 1.2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  quickMiniLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0,
  },

  quickActionsRow: {
    flexDirection: "row",
    gap: 18,
    justifyContent: "center",
    width: "100%",
  },

  actionCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.2,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },

  sectionHeaderSpaced: {
    justifyContent: "space-between",
  },

  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },

  sectionIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.15,
  },

  inlineAction: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },

  inlineActionText: {
    fontSize: 12,
    fontWeight: "600",
  },

  inlineActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },

  detailLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    paddingRight: 12,
    flex: 1,
  },

  miniIconWrapper: {
    marginRight: 8,
    opacity: 0.75,
  },

  detailLabel: {
    fontSize: 13,
    fontWeight: "500",
  },

  detailValue: {
    fontSize: 13,
    fontWeight: "500",
    maxWidth: "62%",
    textAlign: "right",
    lineHeight: 18,
  },

  addressText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 14,
    padding: 12,
    borderRadius: 14,
    opacity: 0.96,
    fontWeight: "400",
  },

  locationGrid: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },

  locItemBox: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },

  gridRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 16,
  },

  gridLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 5,
  },

  gridValue: {
    fontWeight: "500",
    fontSize: 15,
    lineHeight: 20,
  },

  gridValueLarge: {
    fontWeight: "600",
    fontSize: 16,
    lineHeight: 22,
  },

  creditValue: {
    fontSize: 18,
    fontWeight: "600",
  },

  imageScrollContent: {
    gap: 12,
    paddingRight: 6,
  },

  imageCard: {
    width: 200,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },

  customerImage: {
    width: "100%",
    height: 156,
    backgroundColor: "rgba(0,0,0,0.08)",
  },

  imageCaption: {
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: "400",
  },

  notesText: {
    fontSize: 14,
    lineHeight: 25,
    opacity: 0.96,
  },

  notePaper: {
    position: "relative",
    borderRadius: 18,
    borderWidth: 1,
    paddingTop: 18,
    paddingHorizontal: 14,
    paddingBottom: 12,
    overflow: "hidden",
  },

  noteQuoteMark: {
    position: "absolute",
    top: 6,
    left: 12,
    fontSize: 28,
    lineHeight: 28,
    fontWeight: "500",
  },

  notePaperText: {
    paddingLeft: 10,
    paddingRight: 6,
    paddingTop: 10,
    paddingBottom: 8,
    lineHeight: 26,
    fontWeight: "400",
  },

  noteMetaLine: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },

  noteMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  noteMetaText: {
    fontSize: 11,
    fontWeight: "500",
  },

  quotationLoadingWrap: {
    minHeight: 88,
    alignItems: "center",
    justifyContent: "center",
  },

  quotationScrollArea: {
    maxHeight: 340,
  },

  quotationScrollContent: {
    gap: 12,
    paddingRight: 4,
  },

  quotationMiniCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
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
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },

  quotationMiniDate: {
    fontSize: 11,
    fontWeight: "400",
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
    fontWeight: "600",
  },

  quotationMiniBottomRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  quotationMiniCurrency: {
    fontSize: 11,
    fontWeight: "500",
  },

  quotationMiniTotal: {
    fontSize: 16,
    fontWeight: "600",
  },

  statusContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },

  pendingBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.10)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
  },

  pendingText: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "600",
  },

  footerTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
    letterSpacing: 0.1,
  },

  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  footerIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  footerText: {
    fontSize: 12,
    fontWeight: "400",
    flex: 1,
    lineHeight: 18,
  },

  emptyState: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyStateIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  emptyStateTitle: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },

  emptyStateSubtitle: {
    fontSize: 12,
    fontWeight: "400",
    textAlign: "center",
  },

  emptyStateInline: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },

  emptyStateInlineText: {
    fontSize: 12,
    fontWeight: "400",
  },
});
