import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Dimensions,
  Platform,
} from "react-native";
import { Text } from "../../../components/ui/text"; 
import { useUIStore } from "../../../store/ui"; 
import { ArrowDown01Icon, CheckmarkCircle02Icon } from "hugeicons-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface PickerItem {
  label: string;
  value: string | number;
}

interface PremiumPickerProps {
  label?: string;
  items: PickerItem[];
  value?: string | number | null;
  onValueChange: (value: any) => void;
  placeholder?: string;
  error?: string;
  description?: string;
}

export function PremiumPicker({
  label,
  items,
  value,
  onValueChange,
  placeholder = "Seçiniz",
  error,
  description,
}: PremiumPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { themeMode } = useUIStore();
  const insets = useSafeAreaInsets();
  const isDark = themeMode === "dark";

  const selectedItem = items.find((item) => item.value === value);

  const THEME = {
    inputBg: isDark ? "rgba(0,0,0,0.3)" : "#F8FAFC",
    inputBorder: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.15)",
    modalBg: isDark ? "#0f172a" : "#FFFFFF",
    modalBorder: isDark ? "rgba(255,255,255,0.08)" : "transparent",
    text: isDark ? "#F8FAFC" : "#0F172A",
    textMute: isDark ? "#94a3b8" : "#64748B",
    primary: "#db2777", 
    itemBorder: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    selectedBg: isDark ? 'rgba(219, 39, 119, 0.15)' : '#FFF0F5', 
    overlay: isDark ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.5)",
    shadow: isDark ? "#000000" : "#64748b",
  };

  const handleSelect = (val: any) => {
    onValueChange(val);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: THEME.textMute }]}>{label}</Text>}

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setIsOpen(true)}
        style={[
          styles.trigger,
          { 
            backgroundColor: THEME.inputBg, 
            borderColor: error ? "#ef4444" : THEME.inputBorder 
          },
        ]}
      >
        <Text 
          style={[
            styles.triggerText, 
            { color: selectedItem ? THEME.text : THEME.textMute }
          ]}
          numberOfLines={1}
        >
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
        <ArrowDown01Icon 
            size={14}
            color={THEME.textMute} 
            variant="stroke"
            strokeWidth={1.5} 
        />
      </TouchableOpacity>

      {description ? <Text style={[styles.description, { color: THEME.textMute }]}>{description}</Text> : null}

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal 
        visible={isOpen} 
        transparent 
        animationType="slide" 
        onRequestClose={() => setIsOpen(false)}
        statusBarTranslucent
      >
        <View style={[styles.modalOverlay, { backgroundColor: THEME.overlay }]}>
          <TouchableOpacity style={styles.backdrop} onPress={() => setIsOpen(false)} activeOpacity={1} />
          
          <View style={[
              styles.modalContent, 
              { 
                backgroundColor: THEME.modalBg, 
                paddingBottom: insets.bottom + 10,
                borderColor: THEME.modalBorder,
                shadowColor: THEME.shadow
              }
            ]}>
            
            <View style={[styles.header, { borderBottomColor: THEME.itemBorder }]}>
              <View style={[styles.handle, { backgroundColor: THEME.textMute }]} />
              <Text style={[styles.modalTitle, { color: THEME.text }]}>
                {label || placeholder}
              </Text>
            </View>

            <FlatList
              data={items}
              keyExtractor={(item) => String(item.value)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <TouchableOpacity
                    activeOpacity={0.7} 
                    onPress={() => handleSelect(item.value)}
                    style={[
                        styles.optionItem,
                        { 
                            borderBottomColor: THEME.itemBorder,
                            backgroundColor: isSelected ? THEME.selectedBg : 'transparent'
                        }
                    ]}
                  >
                    <Text 
                        style={[
                            styles.optionText, 
                            { 
                              color: isSelected ? THEME.primary : THEME.text, 
                              fontWeight: isSelected ? "700" : "500" 
                            }
                        ]}
                    >
                      {item.label}
                    </Text>
                    {isSelected && (
                        <CheckmarkCircle02Icon 
                            size={18}
                            color={THEME.primary} 
                            variant="stroke" 
                            strokeWidth={2}
                        />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <Text style={{ color: THEME.textMute }}>Veri bulunamadı.</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    marginBottom: 0 
  },
  label: { 
    fontSize: 12,
    fontWeight: "600", 
    marginBottom: 4,
    marginLeft: 2
  },
  trigger: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  triggerText: { 
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
    marginRight: 6,
    marginTop: Platform.OS === 'android' ? 2 : 0 
  },
  errorText: { 
    color: "#ef4444", 
    fontSize: 11,
    marginTop: 4, 
    marginLeft: 2,
    fontWeight: '500'
  },
  description: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
    marginLeft: 2,
  },
  modalOverlay: { 
    flex: 1, 
    justifyContent: "flex-end" 
  },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: Dimensions.get("window").height * 0.70,
    minHeight: 250,
    borderWidth: Platform.OS === 'ios' ? 0 : 1,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 24,
  },
  header: { 
    alignItems: "center", 
    paddingTop: 12,
    paddingBottom: 12, 
    borderBottomWidth: 1,
  },
  handle: { 
    width: 40,
    height: 4,
    borderRadius: 2, 
    marginBottom: 10,
    opacity: 0.25
  },
  modalTitle: { 
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2
  },
  listContent: {
      paddingBottom: 20
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  optionText: { 
    fontSize: 14,
    letterSpacing: -0.2
  },
  emptyContainer: {
      padding: 20,
      alignItems: 'center',
      justifyContent: 'center'
  }
});
