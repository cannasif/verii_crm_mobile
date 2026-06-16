import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { VoiceSearchButton } from "./VoiceSearchButton";

interface PickerOption {
  id: number | string;
  name: string;
  code?: string;
}

interface PickerModalProps {
  visible: boolean;
  options: PickerOption[];
  selectedValue?: number | string;
  onSelect: (option: PickerOption) => void;
  onClose: () => void;
  title: string;
  searchPlaceholder?: string;
  isLoading?: boolean;
}

export function PickerModal({
  visible,
  options,
  selectedValue,
  onSelect,
  onClose,
  title,
  searchPlaceholder = "Ara...",
  isLoading = false,
}: PickerModalProps): React.ReactElement {
  const { colors, themeMode } = useUIStore();
  const insets = useSafeAreaInsets();

  const isDark = themeMode === "dark";
  const mainBg = isDark ? "#161224" : colors.card;
  const inputBg = isDark ? "rgba(255,255,255,0.03)" : colors.backgroundSecondary;
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : colors.border;
  const textColor = isDark ? "#F8FAFC" : colors.text;
  const textMuted = isDark ? "#94A3B8" : colors.textSecondary;

  const [searchText, setSearchText] = useState("");

  const filteredOptions = useMemo(() => {
    if (!searchText.trim()) return options;
    const searchLower = searchText.toLowerCase();
    return options.filter(
      (option) =>
        option.name.toLowerCase().includes(searchLower) ||
        (option.code && option.code.toLowerCase().includes(searchLower))
    );
  }, [options, searchText]);

  const handleSelect = useCallback(
    (option: PickerOption) => {
      onSelect(option);
      onClose();
    },
    [onSelect, onClose]
  );

  const renderOption = useCallback(
    ({ item }: { item: PickerOption }) => {
      const isSelected = selectedValue === item.id;

      return (
        <TouchableOpacity
          style={[
            styles.optionItem,
            { borderBottomColor: borderColor },
            isSelected && { backgroundColor: isDark ? "rgba(236, 72, 153, 0.1)" : colors.accent + "15" },
          ]}
          onPress={() => handleSelect(item)}
          activeOpacity={0.7}
        >
          <View style={styles.optionContent}>
            <Text style={[styles.optionName, { color: textColor }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.code && (
              <Text style={[styles.optionCode, { color: textMuted }]} numberOfLines={1}>
                {item.code}
              </Text>
            )}
          </View>
          {isSelected && (
            <View style={[styles.checkmark, { backgroundColor: colors.accent }]}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [selectedValue, borderColor, isDark, colors.accent, textColor, textMuted, handleSelect]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} />
        <View
          style={[
            styles.modalContent,
            { backgroundColor: mainBg, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
            <View style={[styles.handle, { backgroundColor: borderColor }]} />
            <Text style={[styles.modalTitle, { color: textColor }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: textColor }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.searchRow, { backgroundColor: inputBg, borderBottomColor: borderColor }]}>
            <TextInput
              style={[styles.searchInput, { color: textColor, borderColor: borderColor }]}
              placeholder={searchPlaceholder}
              placeholderTextColor={textMuted}
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
            />
            <VoiceSearchButton onResult={setSearchText} />
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : filteredOptions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: textMuted }]}>Sonuç bulunamadı</Text>
            </View>
          ) : (
            <FlatList
              data={filteredOptions}
              renderItem={renderOption}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  handle: {
    position: "absolute",
    top: 8,
    left: "50%",
    transform: [{ translateX: -20 }],
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: "300",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  listContent: {
    paddingVertical: 8,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  optionContent: {
    flex: 1,
    marginRight: 12,
  },
  optionName: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 4,
  },
  optionCode: {
    fontSize: 13,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});