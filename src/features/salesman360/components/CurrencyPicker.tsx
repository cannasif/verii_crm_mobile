import React from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import type { ThemeColors } from "../../../constants/theme";
import { Text } from "../../../components/ui/text";
import { Tick02Icon } from "hugeicons-react-native";

const ALL_VALUE = "ALL";

export interface Salesman360OutlineChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: ThemeColors;
}

export function Salesman360OutlineChip({
  label,
  selected,
  onPress,
  colors,
}: Salesman360OutlineChipProps): React.ReactElement {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[
        styles.ringChip,
        selected
          ? {
              borderWidth: 2,
              borderColor: colors.accent,
              backgroundColor: colors.activeBackground,
            }
          : {
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
            },
      ]}
    >
      {selected ? (
        <Tick02Icon size={12} color={colors.accent} variant="stroke" strokeWidth={2.1} />
      ) : null}
      <Text
        unstyled
        style={[
          styles.ringChipText,
          {
            color: selected ? colors.accent : colors.textMuted,
            fontWeight: selected ? "800" : "600",
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

interface CurrencyPickerProps {
  selectedCurrency: string;
  currencyOptions: string[];
  label: string;
  allLabel: string;
  colors: ThemeColors;
  onSelect: (value: string) => void;
  showLabel?: boolean;
  compact?: boolean;
  chipStyle?: "filled" | "ring";
  horizontal?: boolean;
}

export function CurrencyPicker({
  selectedCurrency,
  currencyOptions,
  label,
  allLabel,
  colors,
  onSelect,
  showLabel = true,
  compact = false,
  chipStyle = "filled",
  horizontal = false,
}: CurrencyPickerProps): React.ReactElement {
  const optionPad = compact ? styles.optionCompact : styles.optionDefault;
  const optionFont = compact ? styles.optionTextCompact : styles.optionTextDefault;
  const rowGap = compact ? styles.optionsRowCompact : styles.optionsRowDefault;

  if (chipStyle === "ring") {
    const chipRail = (
      <>
        <Salesman360OutlineChip
          label={allLabel}
          selected={selectedCurrency === ALL_VALUE}
          onPress={() => onSelect(ALL_VALUE)}
          colors={colors}
        />
        {currencyOptions.map((code) => (
          <Salesman360OutlineChip
            key={code}
            label={code}
            selected={selectedCurrency === code}
            onPress={() => onSelect(code)}
            colors={colors}
          />
        ))}
      </>
    );

    return (
      <View style={styles.wrapper}>
        {showLabel ? (
          <Text unstyled style={[styles.labelRingHeader, { color: colors.textSecondary }]}>{label}</Text>
        ) : null}
        {horizontal ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalRail}
          >
            {chipRail}
          </ScrollView>
        ) : (
          <View style={styles.ringWrap}>{chipRail}</View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {showLabel ? (
        <Text
          style={[
            compact ? styles.labelCompact : styles.labelDefault,
            { color: colors.textMuted },
          ]}
        >
          {label}
        </Text>
      ) : null}
      <View style={[styles.optionsRow, rowGap, { borderColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.optionBase,
            optionPad,
            {
              borderColor: selectedCurrency === ALL_VALUE ? colors.accent : colors.border,
              backgroundColor:
                selectedCurrency === ALL_VALUE ? colors.accent : colors.backgroundSecondary,
            },
          ]}
          onPress={() => onSelect(ALL_VALUE)}
        >
          <Text
            style={[
              optionFont,
              {
                color:
                  selectedCurrency === ALL_VALUE ? colors.onAccent : colors.textSecondary,
              },
            ]}
          >
            {allLabel}
          </Text>
        </TouchableOpacity>
        {currencyOptions.map((code) => {
          const isSelected = selectedCurrency === code;
          return (
            <TouchableOpacity
              key={code}
              style={[
                styles.optionBase,
                optionPad,
                {
                  borderColor: isSelected ? colors.accent : colors.border,
                  backgroundColor: isSelected ? colors.accent : colors.backgroundSecondary,
                },
              ]}
              onPress={() => onSelect(code)}
            >
              <Text
                style={[
                  optionFont,
                  { color: isSelected ? colors.onAccent : colors.textSecondary },
                ]}
              >
                {code}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 0,
  },
  labelDefault: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  labelCompact: {
    fontSize: 9,
    fontWeight: "600",
    marginBottom: 6,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  },
  labelRingHeader: {
    fontSize: 8.5,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: 1.35,
    textTransform: "uppercase",
    opacity: 0.92,
  },
  horizontalRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 0,
    paddingRight: 5,
    paddingBottom: 2,
  },
  ringWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  ringChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 6,
    flexShrink: 0,
  },
  ringChipText: {
    fontSize: 11,
    letterSpacing: 0.11,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingVertical: 2,
  },
  optionsRowDefault: {
    gap: 8,
  },
  optionsRowCompact: {
    gap: 6,
  },
  optionBase: {
    borderRadius: 999,
    borderWidth: 1,
  },
  optionDefault: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  optionCompact: {
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  optionTextDefault: {
    fontSize: 13,
    fontWeight: "700",
  },
  optionTextCompact: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.15,
  },
});

export { ALL_VALUE as CURRENCY_ALL };
