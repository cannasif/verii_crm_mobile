import React, { useCallback, useState, useMemo, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useCustomers } from "../hooks";
import type { CustomerDto } from "../types";
// YENİ İKONLAR
import { ArrowDown01Icon, Cancel01Icon, CheckmarkCircle02Icon, Search01Icon } from "hugeicons-react-native";

interface CustomerPickerProps {
  value?: number;
  customerName?: string;
  onChange: (customer: CustomerDto | undefined) => void;
  disabled?: boolean;
  label?: string;
}

export function CustomerPicker({
  value,
  customerName,
  onChange,
  disabled = false,
  label,
}: CustomerPickerProps): React.ReactElement {
  const { t } = useTranslation();
  const { colors, themeMode } = useUIStore();
  const insets = useSafeAreaInsets();

  const isDark = themeMode === "dark";

  // --- TEMA ---
  const THEME = {
    bg: isDark ? "#1a0b2e" : colors.background,
    cardBg: isDark ? "#18181b" : colors.card,
    text: isDark ? "#FFFFFF" : colors.text,
    textMute: isDark ? "#94a3b8" : colors.textMuted,
    border: isDark ? "#3f3f46" : colors.border,
    primary: "#db2777",
    inputBg: isDark ? "#27272a" : colors.backgroundSecondary,
  };

  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 700);

    return () => clearTimeout(handler);
  }, [searchText]);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useCustomers({
    enabled: isOpen,
    search: debouncedSearch.length >= 2 ? debouncedSearch : undefined,
  });

  const customers = useMemo(() => {
    return data?.pages.flatMap((page) => page.items) || [];
  }, [data]);

  const handleOpen = useCallback(() => {
    if (!disabled) {
      setIsOpen(true);
      setSearchText("");
    }
  }, [disabled]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchText("");
  }, []);

  const handleSelect = useCallback(
    (customer: CustomerDto) => {
      onChange(customer);
      handleClose();
    },
    [onChange, handleClose]
  );

  const handleClear = useCallback(() => {
    onChange(undefined);
  }, [onChange]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderCustomerItem = useCallback(
    ({ item }: { item: CustomerDto }) => {
      const isSelected = value === item.id;

      return (
        <TouchableOpacity
          style={[
            styles.customerItem,
            { borderBottomColor: THEME.border },
            isSelected && { backgroundColor: isDark ? "rgba(219, 39, 119, 0.1)" : colors.activeBackground },
          ]}
          onPress={() => handleSelect(item)}
        >
          <View style={styles.customerInfo}>
            <Text style={[styles.customerName, { color: THEME.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.customerCode && (
              <Text style={[styles.customerCode, { color: THEME.textMute }]}>
                {item.customerCode}
              </Text>
            )}
          </View>
          {isSelected && <CheckmarkCircle02Icon size={20} color={THEME.primary} variant="stroke" />}
        </TouchableOpacity>
      );
    },
    [value, THEME, handleSelect, isDark, colors]
  );

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoading}>
        <ActivityIndicator size="small" color={THEME.primary} />
      </View>
    );
  }, [isFetchingNextPage, THEME]);

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: THEME.textMute }]}>{label}</Text>}
      
      <TouchableOpacity
        style={[
          styles.field,
          { backgroundColor: THEME.inputBg, borderColor: THEME.border },
          disabled && styles.fieldDisabled,
        ]}
        onPress={handleOpen}
        disabled={disabled}
      >
        <Text
          style={[
            styles.fieldText,
            { color: customerName ? THEME.text : THEME.textMute },
          ]}
          numberOfLines={1}
        >
          {customerName || t("customer.selectCustomer")}
        </Text>
        
        {value ? (
          <TouchableOpacity onPress={handleClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Cancel01Icon size={16} color={THEME.textMute} variant="stroke" />
          </TouchableOpacity>
        ) : (
          <ArrowDown01Icon size={16} color={THEME.textMute} />
        )}
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="slide" onRequestClose={handleClose}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={handleClose} />
          
          <View
            style={[
              styles.modalContent,
              { backgroundColor: THEME.cardBg, paddingBottom: insets.bottom + 16 },
            ]}
          >
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: THEME.border }]}>
            <View
  style={[
    styles.handle,
    {
      backgroundColor: isDark
        ? "rgba(255,255,255,0.25)"
        : "rgba(15,23,42,0.12)",
    },
  ]}
/>
              <Text style={[styles.modalTitle, { color: THEME.text }]}>
                {t("customer.selectCustomer")}
              </Text>
            </View>

            {/* Arama Inputu */}
            <View style={[styles.searchContainer, { borderBottomColor: THEME.border }]}>
              <View style={[styles.searchInputWrapper, { backgroundColor: THEME.inputBg }]}>
                 <Search01Icon size={18} color={THEME.textMute} style={{ marginLeft: 10 }} />
                 <TextInput
                    style={[styles.searchInput, { color: THEME.text }]}
                    value={searchText}
                    onChangeText={setSearchText}
                    placeholder={t("customer.searchCustomer")}
                    placeholderTextColor={THEME.textMute}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
              </View>
            </View>

            {/* Liste */}
            {isLoading && customers.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={THEME.primary} />
              </View>
            ) : customers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: THEME.textMute }]}>
                  {t("common.noResults")}
                </Text>
              </View>
            ) : (
              <FlatList
                data={customers}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderCustomerItem}
                style={styles.list}
                showsVerticalScrollIndicator={false}
                onEndReached={handleEndReached}
                onEndReachedThreshold={0.3}
                ListFooterComponent={renderFooter}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50, // Diğer inputlarla aynı yükseklik
  },
  fieldDisabled: {
    opacity: 0.5,
  },
  fieldText: {
    fontSize: 15,
    flex: 1,
    fontWeight: "500",
  },
  
  // --- MODAL STİLLERİ ---
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
  },
  modalHeader: {
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
    
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  
  // --- ARAMA ALANI ---
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    height: 44,
    fontSize: 15,
  },
  
  // --- LİSTE ---
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
  },
  list: {
    flexGrow: 0,
  },
  customerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "500",
  },
  customerCode: {
    fontSize: 13,
    marginTop: 2,
    opacity: 0.7,
  },
  footerLoading: {
    padding: 16,
    alignItems: "center",
  },
});
