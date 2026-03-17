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
import { useCustomers } from "../../customer/hooks";
import type { CustomerDto } from "../../customer/types";

interface CustomerPickerProps {
  value?: number;
  customerName?: string;
  onChange: (customer: CustomerDto | undefined) => void;
  disabled?: boolean;
  label?: string;
  required?: boolean;
}

export function CustomerPicker({
  value,
  customerName,
  onChange,
  disabled = false,
  label,
  required = false,
}: CustomerPickerProps): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useUIStore();
  const insets = useSafeAreaInsets();

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
            { borderBottomColor: colors.border },
            isSelected && { backgroundColor: colors.activeBackground },
          ]}
          onPress={() => handleSelect(item)}
        >
          <View style={styles.customerInfo}>
            <Text style={[styles.customerName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.customerCode && (
              <Text style={[styles.customerCode, { color: colors.textMuted }]}>
                {item.customerCode}
              </Text>
            )}
          </View>
          {isSelected && <Text style={[styles.checkmark, { color: colors.accent }]}>✓</Text>}
        </TouchableOpacity>
      );
    },
    [value, colors, handleSelect]
  );

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoading}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }, [isFetchingNextPage, colors]);

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
          {required && <Text style={[styles.required, { color: colors.error }]}>*</Text>}
        </View>
      )}
      <TouchableOpacity
        style={[
          styles.field,
          { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
          disabled && styles.fieldDisabled,
        ]}
        onPress={handleOpen}
        disabled={disabled}
      >
        <Text
          style={[
            styles.fieldText,
            { color: customerName ? colors.text : colors.textMuted },
          ]}
          numberOfLines={1}
        >
          {customerName || t("activity.selectCustomer")}
        </Text>
        {value ? (
          <TouchableOpacity onPress={handleClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.clearIcon, { color: colors.textMuted }]}>✕</Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.arrow, { color: colors.textMuted }]}>▼</Text>
        )}
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="slide" onRequestClose={handleClose}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={handleClose} />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t("activity.selectCustomer")}
              </Text>
            </View>

            <View style={[styles.searchContainer, { borderBottomColor: colors.border }]}>
              <TextInput
                style={[
                  styles.searchInput,
                  { backgroundColor: colors.backgroundSecondary, color: colors.text },
                ]}
                value={searchText}
                onChangeText={setSearchText}
                placeholder={t("activity.searchCustomer")}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {isLoading && customers.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
              </View>
            ) : customers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
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
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  required: {
    fontSize: 14,
    marginLeft: 4,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
  },
  fieldDisabled: {
    opacity: 0.5,
  },
  fieldText: {
    fontSize: 15,
    flex: 1,
  },
  arrow: {
    fontSize: 10,
    marginLeft: 8,
  },
  clearIcon: {
    fontSize: 14,
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchInput: {
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 15,
  },
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
  },
  checkmark: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 12,
  },
  footerLoading: {
    padding: 16,
    alignItems: "center",
  },
});
