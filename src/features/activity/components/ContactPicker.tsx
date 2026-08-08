import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useCustomerContacts } from "../../contact/hooks/useContacts";
import type { ContactDto } from "../../contact/types/contact";

interface ContactPickerProps {
  value?: number;
  contactName?: string;
  customerId?: number;
  onChange: (contact: ContactDto | undefined) => void;
  disabled?: boolean;
  label?: string;
  required?: boolean;
}

export function ContactPicker({
  value,
  contactName,
  customerId,
  onChange,
  disabled = false,
  label,
  required = false,
}: ContactPickerProps): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useUIStore();
  const insets = useSafeAreaInsets();

  const [isOpen, setIsOpen] = useState(false);

  const isDisabled = disabled || !customerId;

  const { data: contacts, isLoading } = useCustomerContacts(customerId);

  const handleOpen = useCallback(() => {
    if (!isDisabled) {
      setIsOpen(true);
    }
  }, [isDisabled]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSelect = useCallback(
    (contact: ContactDto) => {
      onChange(contact);
      handleClose();
    },
    [onChange, handleClose]
  );

  const handleClear = useCallback(() => {
    onChange(undefined);
  }, [onChange]);

  const renderContactItem = useCallback(
    ({ item }: { item: ContactDto }) => {
      const isSelected = value === item.id;
      const displayName = item.fullName;

      return (
        <TouchableOpacity
          style={[
            styles.contactItem,
            { borderBottomColor: colors.border },
            isSelected && { backgroundColor: colors.activeBackground },
          ]}
          onPress={() => handleSelect(item)}
        >
          <Text style={[styles.contactName, { color: colors.text }]} numberOfLines={1}>
            {displayName}
          </Text>
          {isSelected && <Text style={[styles.checkmark, { color: colors.accent }]}>✓</Text>}
        </TouchableOpacity>
      );
    },
    [value, colors, handleSelect]
  );

  const getDisplayText = useMemo(() => {
    if (!customerId) {
      return t("activity.selectCustomerFirst");
    }
    return contactName || t("activity.selectContact");
  }, [customerId, contactName, t]);

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
          isDisabled && styles.fieldDisabled,
        ]}
        onPress={handleOpen}
        disabled={isDisabled}
      >
        <Text
          style={[
            styles.fieldText,
            { color: contactName && customerId ? colors.text : colors.textMuted },
          ]}
          numberOfLines={1}
        >
          {getDisplayText}
        </Text>
        {value && customerId ? (
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
                {t("activity.selectContact")}
              </Text>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
              </View>
            ) : !contacts || contacts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {t("activity.noContacts")}
                </Text>
              </View>
            ) : (
              <FlatList
                data={contacts}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderContactItem}
                style={styles.list}
                showsVerticalScrollIndicator={false}
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
    maxHeight: "60%",
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
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 12,
  },
});
