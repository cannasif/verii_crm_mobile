import React, { useState, useMemo } from "react";
import { View, TouchableOpacity, StyleSheet, TextInput, ScrollView, Text } from "react-native";
import { ArrowDown01Icon, Search01Icon } from "hugeicons-react-native";
import { useUIStore } from "../../../store/ui";
import { normalizeSearchText } from "../../../lib/normalizeSearchText";

interface FilterCustomerDropdownProps {
  customers: { id: number; name: string }[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function FilterCustomerDropdown({ customers, selectedId, onSelect, isOpen, onToggle }: FilterCustomerDropdownProps) {
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";
  const [searchQuery, setSearchQuery] = useState("");

  const BRAND_COLOR = "#db2777";
  const BRAND_COLOR_DARK = "#ec4899";
  
  const theme = {
    primary: isDark ? BRAND_COLOR_DARK : BRAND_COLOR,
    surfaceBg: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
    borderColor: isDark ? 'rgba(236, 72, 153, 0.3)' : 'rgba(219, 39, 119, 0.2)',
    textMute: isDark ? "#94a3b8" : "#64748B",
    text: isDark ? "#FFFFFF" : "#0F172A",
    filterBg: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
    filterText: isDark ? '#CBD5E1' : '#475569',
  };

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const query = normalizeSearchText(searchQuery);
    return customers.filter(c => normalizeSearchText(c.name).includes(query));
  }, [customers, searchQuery]);

  const selectedName = customers.find(c => c.id === selectedId)?.name || "Tüm Müşteriler";

  const handleToggle = () => {
    onToggle();
    if (!isOpen) setSearchQuery("");
  };

  const handleSelect = (id: number | null) => {
    onSelect(id);
    setSearchQuery("");
  };

  return (
    <View>
      <TouchableOpacity 
        style={[styles.dropdownBtn, { backgroundColor: theme.filterBg, borderColor: isOpen ? theme.primary : 'transparent' }]}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <Text style={[styles.dropdownBtnText, { color: selectedId ? theme.primary : theme.filterText, fontWeight: selectedId ? '700' : '500' }]}>
          {selectedName}
        </Text>
        <ArrowDown01Icon size={20} color={selectedId ? theme.primary : theme.textMute} style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }} />
      </TouchableOpacity>

      {isOpen && (
        <View style={[styles.dropdownListContainer, { backgroundColor: theme.surfaceBg, borderColor: theme.borderColor }]}>
          <View style={[styles.dropdownSearchWrapper, { borderBottomColor: theme.borderColor }]}>
            <Search01Icon size={16} color={theme.textMute} />
            <TextInput
              style={[styles.dropdownSearchInput, { color: theme.text }]}
              placeholder="Müşteri ara..."
              placeholderTextColor={theme.textMute}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled={true}>
            {searchQuery.trim() === "" && (
              <TouchableOpacity 
                style={[styles.dropdownItem, { borderBottomColor: theme.borderColor }]} 
                onPress={() => handleSelect(null)}
              >
                <Text style={[styles.dropdownItemText, { color: !selectedId ? theme.primary : theme.textMute, fontWeight: !selectedId ? '700' : '500' }]}>Tüm Müşteriler</Text>
              </TouchableOpacity>
            )}
            
            {filteredCustomers?.map(customer => (
              <TouchableOpacity 
                key={customer.id} 
                style={[styles.dropdownItem, { borderBottomColor: theme.borderColor }]} 
                onPress={() => handleSelect(customer.id)}
              >
                <Text style={[styles.dropdownItemText, { color: selectedId === customer.id ? theme.primary : theme.textMute, fontWeight: selectedId === customer.id ? '700' : '500' }]}>
                  {customer.name}
                </Text>
              </TouchableOpacity>
            ))}

            {filteredCustomers.length === 0 && (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <Text style={{ color: theme.textMute, fontSize: 13 }}>Sonuç bulunamadı</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dropdownBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  dropdownBtnText: {
    fontSize: 14,
    letterSpacing: 0.3,
  },
  dropdownListContainer: {
    marginTop: 6,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dropdownSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    padding: 0,
    height: 20,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 14,
    letterSpacing: 0.2,
  },
});
