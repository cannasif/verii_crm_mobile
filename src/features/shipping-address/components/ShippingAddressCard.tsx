import React, { memo } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import type { ShippingAddressDto } from "../types";
import {
  MapsSquare02Icon,
  UserCircleIcon,
  Call02Icon,
  Building04Icon
} from "hugeicons-react-native";

interface ShippingAddressCardProps {
  address: ShippingAddressDto;
  onPress: () => void;
}

function ShippingAddressCardComponent({
  address,
  onPress,
}: ShippingAddressCardProps): React.ReactElement {
  const { colors, themeMode } = useUIStore();
  const isDark = themeMode === "dark";
  const primaryColor = "#db2777"; 

  const locationParts: string[] = [];
  if (address.districtName) locationParts.push(address.districtName);
  if (address.cityName) locationParts.push(address.cityName);
  const locationTitle = locationParts.join(", ") || "Konum Belirtilmemiş";
  const displayName = address.name || address.customerName || "BİLİNMEYEN FİRMA";
  const erpCode = address.erpShippingCode || address.erpMainCustomerCode || "";

  const pinkBorder = isDark ? 'rgba(219, 39, 119, 0.4)' : 'rgba(219, 39, 119, 0.3)';
  const pinkBg = isDark ? 'rgba(219, 39, 119, 0.1)' : 'rgba(219, 39, 119, 0.05)';

  return (
    <TouchableOpacity
      style={[
        styles.cardContainer,
        {
          backgroundColor: isDark ? '#1a1625' : '#FFFFFF',
          borderColor: isDark ? 'rgba(219, 39, 119, 0.3)' : 'rgba(219, 39, 119, 0.15)',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.companyWrap}>
          <Building04Icon size={16} color={colors.text} variant="stroke" />
          <Text style={[styles.companyName, { color: colors.text }]} numberOfLines={1}>
            {displayName}
          </Text>
        </View>
        {address.isActive && (
          <View style={styles.activeDotWrap}>
            <View style={styles.activeDot} />
            <Text style={[styles.activeText, { color: colors.success }]}>AKTİF</Text>
          </View>
        )}
      </View>

      {erpCode ? (
        <Text style={[styles.erpCodeText, { color: colors.textMuted }]} numberOfLines={1}>
          ERP: {erpCode}
        </Text>
      ) : null}

      <View style={[styles.solidDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

      <View style={[styles.middleBox, { borderColor: pinkBorder, backgroundColor: pinkBg }]}>
        
        <View style={styles.iconContainer}>
          <MapsSquare02Icon size={20} color={primaryColor} variant="stroke" />
        </View>

        <View style={[styles.verticalDivider, { backgroundColor: pinkBorder }]} />

        <View style={styles.addressContent}>
          <Text style={[styles.addressTitle, { color: primaryColor }]} numberOfLines={1}>
            {locationTitle}
          </Text>
          
          <View style={[styles.pinkDivider, { backgroundColor: pinkBorder }]} />

          <Text style={[styles.addressDetail, { color: colors.textSecondary }]} numberOfLines={2}>
            {address.address || "Adres detayı girilmemiş."}
          </Text>
        </View>
      </View>

      <View style={[styles.dashedDivider, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />

      <View style={styles.footer}>
        <View style={styles.contactWrap}>
          <View style={styles.contactItem}>
            <UserCircleIcon size={12} color={colors.textMuted} variant="stroke" />
            <Text style={[styles.contactText, { color: colors.textMuted }]} numberOfLines={1}>
              {address.contactPerson || "Kişi Belirtilmemiş"}
            </Text>
          </View>
          
          <View style={styles.contactItem}>
            <Call02Icon size={12} color={colors.textMuted} variant="stroke" />
            <Text style={[styles.contactText, { color: colors.textMuted }]} numberOfLines={1}>
              {address.phone || "Telefon Yok"}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const ShippingAddressCard = memo(ShippingAddressCardComponent);

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 16,
    borderWidth: 1.2,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: "#db2777",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  companyWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  companyName: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  erpCodeText: {
    marginTop: -2,
    marginBottom: 8,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.25,
  },
  activeDotWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#10B981",
  },
  activeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  solidDivider: {
    height: 1,
    marginBottom: 10,
  },

  middleBox: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 24,
  },
  verticalDivider: {
    width: 1,
    marginHorizontal: 10,
    alignSelf: "stretch", 
  },
  addressContent: {
    flex: 1,
    justifyContent: "center",
  },
  addressTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
    marginBottom: 4,
    lineHeight: 16,
    minHeight: 16, 
  },
  pinkDivider: {
    height: 1,
    width: "100%",
    marginBottom: 4,
  },
  addressDetail: {
    fontSize: 11,
    lineHeight: 16,
    minHeight: 32,
  },

  dashedDivider: {
    borderBottomWidth: 1,
    borderStyle: "dashed",
    marginBottom: 10,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  contactWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 16,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: '48%',
  },
  contactText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
