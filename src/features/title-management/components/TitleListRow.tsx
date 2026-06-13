import React, { memo } from "react";
import { Pressable, TouchableOpacity, View } from "react-native";
import { Briefcase01Icon, Delete02Icon, Edit02Icon } from "hugeicons-react-native";
import { Text } from "@/components/ui/text";
import { stockBrowseStyles as styles } from "@/components/shared/stock-browse/stockBrowseStyles";
import { useUIStore } from "../../../store/ui";
import type { TitleDto } from "../types";

interface TitleListRowProps {
  title: TitleDto;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function TitleListRowComponent({
  title,
  onPress,
  onEdit,
  onDelete,
}: TitleListRowProps): React.ReactElement {
  const { colors, themeMode } = useUIStore();
  const isDark = themeMode === "dark";
  const frameColor = isDark ? "rgba(255, 255, 255, 0.1)" : colors.border;
  const code = title.code?.trim();

  return (
    <View style={styles.listItemShell}>
      <Pressable
        style={({ pressed }) => [styles.listRowPressable, pressed && styles.listRowPressed]}
        android_ripple={{ color: "rgba(0,0,0,0)" }}
        onPress={onPress}
      >
        <View style={styles.listRowInner}>
          <View
            style={[
              styles.listIconCircle,
              {
                borderColor: frameColor,
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
              },
            ]}
          >
            <Briefcase01Icon size={18} color={colors.textMuted + "88"} variant="stroke" strokeWidth={1.8} />
          </View>

          <View style={styles.listTextCol}>
            {code ? (
              <Text
                unstyled
                disableThemeColor
                style={[styles.listCode, { color: colors.accent }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {code}
              </Text>
            ) : null}
            <Text
              unstyled
              disableThemeColor
              style={[styles.listName, { color: colors.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {title.titleName}
            </Text>
          </View>

          <View style={styles.listActionsCol}>
            <TouchableOpacity
              onPress={(event) => {
                event.stopPropagation();
                onEdit();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
              activeOpacity={0.7}
            >
              <Edit02Icon size={17} color={isDark ? "#CBD5E1" : "#64748B"} variant="stroke" strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={(event) => {
                event.stopPropagation();
                onDelete();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
              activeOpacity={0.7}
            >
              <Delete02Icon size={17} color="#EF4444" variant="stroke" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

export const TitleListRow = memo(TitleListRowComponent);
