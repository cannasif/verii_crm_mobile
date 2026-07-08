import React from "react";
import { View, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";

export type LineFormDescriptionFieldsColors = {
  text: string;
  textSecondary: string;
  accent: string;
  inputBackground: string;
  border: string;
  inputText?: string;
  cardBackground?: string;
  cardBorder?: string;
};

type LineFormDescriptionFieldsSectionProps = {
  description1: string;
  description2: string;
  description3: string;
  description1Label?: string;
  description2Label?: string;
  description3Label?: string;
  description1Placeholder?: string;
  description2Placeholder?: string;
  description3Placeholder?: string;
  onDescription1Change: (value: string) => void;
  onDescription2Change: (value: string) => void;
  onDescription3Change: (value: string) => void;
  profilDefinitionId: number | null;
  demirDefinitionId: number | null;
  vidaDefinitionId: number | null;
  baskiDefinitionId: number | null;
  profilMap: Record<number, string>;
  demirMap: Record<number, string>;
  vidaMap: Record<number, string>;
  baskiMap: Record<number, string>;
  onProfilPress: () => void;
  onDemirPress: () => void;
  onVidaPress: () => void;
  onBaskiPress: () => void;
  onBaskiCreatePress: () => void;
  baskiAciklama: string;
  onBaskiAciklamaChange: (value: string) => void;
  isDefinitionOptionsLoading?: boolean;
  profilError?: boolean;
  colors: LineFormDescriptionFieldsColors;
  compact?: boolean;
};

export function LineFormDescriptionFieldsSection({
  description1,
  description2,
  description3,
  description1Label = "Açıklama 1",
  description2Label = "Açıklama 2",
  description3Label = "Açıklama 3",
  description1Placeholder = description1Label,
  description2Placeholder = description2Label,
  description3Placeholder = description3Label,
  onDescription1Change,
  onDescription2Change,
  onDescription3Change,
  profilDefinitionId,
  demirDefinitionId,
  vidaDefinitionId,
  baskiDefinitionId,
  profilMap,
  demirMap,
  vidaMap,
  baskiMap,
  onProfilPress,
  onDemirPress,
  onVidaPress,
  onBaskiPress,
  onBaskiCreatePress,
  baskiAciklama,
  onBaskiAciklamaChange,
  isDefinitionOptionsLoading = false,
  profilError = false,
  colors,
  compact = false,
}: LineFormDescriptionFieldsSectionProps) {
  const { t } = useTranslation();
  const inputTextColor = colors.inputText ?? colors.text;
  const errorBorderColor = "#EF4444";
  const inputStyle = [
    styles.input,
    compact && styles.compactInput,
    { backgroundColor: colors.inputBackground, borderColor: colors.border, color: inputTextColor },
  ];
  const pickerStyle = [
    styles.pickerButton,
    compact && styles.compactInput,
    { backgroundColor: colors.inputBackground, borderColor: colors.border },
  ];
  const cardStyle = [
    styles.detailCard,
    colors.cardBorder != null && colors.cardBackground != null
      ? { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }
      : { borderColor: colors.border, backgroundColor: colors.inputBackground },
  ];

  const profilLabel = profilDefinitionId != null
    ? profilMap[profilDefinitionId] ?? `#${profilDefinitionId}`
    : isDefinitionOptionsLoading
      ? "Yükleniyor..."
      : compact
        ? "Profil seç"
        : "Profil seçin";

  const demirLabel = demirDefinitionId != null
    ? demirMap[demirDefinitionId] ?? `#${demirDefinitionId}`
    : isDefinitionOptionsLoading
      ? "Yükleniyor..."
      : compact
        ? "Demir seç"
        : "Demir seçin";

  const vidaLabel = vidaDefinitionId != null
    ? vidaMap[vidaDefinitionId] ?? `#${vidaDefinitionId}`
    : isDefinitionOptionsLoading
      ? "Yükleniyor..."
      : compact
        ? "Vida seç"
        : "Vida seçin";

  const baskiLabel = baskiDefinitionId != null
    ? baskiMap[baskiDefinitionId] ?? `#${baskiDefinitionId}`
    : isDefinitionOptionsLoading
      ? "Yükleniyor..."
      : compact
        ? "Baskı seç"
        : "Baskı seçin";

  return (
    <View style={cardStyle}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Açıklama Alanları</Text>

      <View style={styles.rowThree}>
        <View style={styles.fieldThird}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{description1Label}</Text>
          <TextInput
            style={inputStyle}
            value={description1}
            onChangeText={onDescription1Change}
            placeholder={description1Placeholder}
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <View style={styles.fieldThird}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{description2Label}</Text>
          <TextInput
            style={inputStyle}
            value={description2}
            onChangeText={onDescription2Change}
            placeholder={description2Placeholder}
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <View style={styles.fieldThird}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{description3Label}</Text>
          <TextInput
            style={inputStyle}
            value={description3}
            onChangeText={onDescription3Change}
            placeholder={description3Placeholder}
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>

      <View style={styles.rowThree}>
        <View style={styles.fieldThird}>
          <Text style={[styles.label, { color: profilError ? errorBorderColor : colors.textSecondary }]}>
            {t("common.profil")} *
          </Text>
          <TouchableOpacity
            style={[
              pickerStyle,
              profilError ? { borderColor: errorBorderColor } : null,
            ]}
            onPress={onProfilPress}
          >
            <Text
              style={[styles.pickerText, { color: profilDefinitionId != null ? colors.text : colors.textSecondary }]}
              numberOfLines={1}
            >
              {profilLabel}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.fieldThird}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Demir</Text>
          <TouchableOpacity style={pickerStyle} onPress={onDemirPress}>
            <Text
              style={[styles.pickerText, { color: demirDefinitionId != null ? colors.text : colors.textSecondary }]}
              numberOfLines={1}
            >
              {demirLabel}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.fieldThird}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Vida</Text>
          <TouchableOpacity style={pickerStyle} onPress={onVidaPress}>
            <Text
              style={[styles.pickerText, { color: vidaDefinitionId != null ? colors.text : colors.textSecondary }]}
              numberOfLines={1}
            >
              {vidaLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.rowTwo}>
        <View style={styles.fieldHalf}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Baskı</Text>
          <TouchableOpacity style={pickerStyle} onPress={onBaskiPress}>
            <Text
              style={[styles.pickerText, { color: baskiDefinitionId != null ? colors.text : colors.textSecondary }]}
              numberOfLines={1}
            >
              {baskiLabel}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.fieldHalf}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Baskı Açıklaması</Text>
          <TextInput
            style={inputStyle}
            value={baskiAciklama}
            onChangeText={(value) => onBaskiAciklamaChange(value.slice(0, 50))}
            maxLength={50}
            placeholder="Baskı açıklaması"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.quickCreateButton} onPress={onBaskiCreatePress} activeOpacity={0.82}>
        <Text style={[styles.quickCreateButtonText, { color: colors.accent }]}>+ Yeni baskı ekle</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  detailCard: {
    marginTop: 8,
    marginBottom: 16,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  rowTwo: {
    flexDirection: "row",
    gap: 10,
  },
  rowThree: {
    flexDirection: "row",
    gap: 8,
  },
  fieldHalf: {
    flex: 1,
  },
  fieldThird: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.35,
    marginLeft: 3,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: "500",
    minHeight: 42,
  },
  compactInput: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    minHeight: 40,
  },
  pickerButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 42,
    justifyContent: "center",
  },
  pickerText: {
    fontSize: 12.5,
    fontWeight: "500",
  },
  quickCreateButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  quickCreateButtonText: {
    fontSize: 12,
    fontWeight: "800",
  },
});
