import React, { useState } from "react";
import { TouchableWithoutFeedback, View, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useUIStore } from "../../../store/ui";
import { UserAdd01Icon, Invoice01Icon, Calendar02Icon, PackageIcon ,CalendarAdd01Icon} from "hugeicons-react-native";

const MODULE_ICONS: Record<string, React.ElementType> = {
  addCustomer: UserAdd01Icon,
  createQuote: Invoice01Icon,
  activities: Calendar02Icon,
  createActivity: CalendarAdd01Icon,
  stock: PackageIcon, 
};

export function ModuleCard({ item, onPress }: any): React.ReactElement {
  const { t } = useTranslation();
  const { themeMode } = useUIStore();
  const [isPressed, setIsPressed] = useState(false);
  
  const Icon = MODULE_ICONS[item.key] ?? PackageIcon;
  const isDark = themeMode === "dark";

  const validColor = (item.color && item.color.startsWith('#')) ? item.color : "#3B82F6";
  
  const cardBg = validColor + (isDark ? "15" : "10");
  const borderColor = validColor + (isDark ? "25" : "20");
  const textColor = isDark ? "#F8FAFC" : "#334155"; 

  return (
    <TouchableWithoutFeedback
      onPress={() => onPress(item.route)}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
    >
      <View style={[
          styles.cardContainer,
          { 
            backgroundColor: cardBg,
            borderColor: borderColor,
            transform: [{ scale: isPressed ? 0.95 : 1 }] 
          }
      ]}>
        <View style={styles.iconWrap}>
          <Icon size={24} color={validColor} strokeWidth={2} />
        </View>
        <Text 
          style={[styles.title, { color: textColor }]} 
          numberOfLines={2} 
          adjustsFontSizeToFit 
          minimumFontScale={0.8}
        >
          {t(`quickActions.${item.key}`, t(`modules.${item.key}`))}
        </Text>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: '23%', 
    aspectRatio: 0.82, 
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderRadius: 22, 
    borderWidth: 1,
    paddingHorizontal: 4,
  },
  iconWrap: {
    marginBottom: 8, 
  },
  title: {
    fontSize: 11, 
    lineHeight: 14, 
    fontWeight: "600", 
    textAlign: "center",
    letterSpacing: -0.43,
  },
});