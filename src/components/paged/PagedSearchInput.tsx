import React, { useEffect, useState } from "react";
import { View, TextInput, StyleSheet, Pressable } from "react-native";
import { Search01Icon, Cancel01Icon } from "hugeicons-react-native";
import { useUIStore } from "../../store/ui";

interface PagedSearchInputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}

export function PagedSearchInput({
  value,
  onChangeText,
  placeholder = "Ara...",
}: PagedSearchInputProps): React.ReactElement {
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";
  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const theme = {
    bg: isDark ? "rgba(255, 255, 255, 0.05)" : "#FFFFFF",
    border: isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0",
    focusBorder: "#db2777",
    text: isDark ? "#FFFFFF" : "#0F172A",
    placeholder: isDark ? "#64748B" : "#94A3B8",
    icon: isDark ? "#94A3B8" : "#64748B",
    clearBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)",
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.bg,
          borderColor: isFocused ? theme.focusBorder : theme.border,
        },
      ]}
    >
      <Search01Icon
        size={20}
        color={isFocused ? theme.focusBorder : theme.icon}
        variant="stroke"
        style={styles.icon}
      />

      <TextInput
        style={[styles.input, { color: theme.text }]}
        value={localValue}
        onChangeText={(nextValue) => {
          setLocalValue(nextValue);
          onChangeText(nextValue);
        }}
        placeholder={placeholder}
        placeholderTextColor={theme.placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />

      {localValue.length > 0 ? (
        <Pressable
          onPress={() => {
            setLocalValue("");
            onChangeText("");
          }}
          style={[styles.clearButton, { backgroundColor: theme.clearBg }]}
        >
          <Cancel01Icon size={16} color={theme.icon} variant="stroke" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0,
    fontWeight: "500",
  },
  clearButton: {
    padding: 4,
    borderRadius: 12,
  },
});
