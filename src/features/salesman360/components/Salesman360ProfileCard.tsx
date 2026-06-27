import React, { useMemo } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Text } from "../../../components/ui/text";
import { type ThemeColors } from "../../../constants/theme";
import { ArrowDown01Icon, UserIcon } from "hugeicons-react-native";

interface Salesman360ProfileCardProps {
  displayName: string;
  email?: string | null;
  roleLabel: string;
  colors: ThemeColors;
  isDark: boolean;
  interactive: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

const FRAME_RADIUS = 20;
const INNER_RADIUS = FRAME_RADIUS - 1;

export function Salesman360ProfileCard({
  displayName,
  email,
  roleLabel,
  colors,
  isDark,
  interactive,
  onPress,
  style,
}: Salesman360ProfileCardProps): React.ReactElement {
  const outerShadow = useMemo(
    () =>
      Platform.select({
        ios: {
          shadowColor: colors.accent,
          shadowOffset: { width: 0, height: 7 },
          shadowOpacity: isDark ? 0.18 : 0.11,
          shadowRadius: 14,
        },
        android: {
          elevation: 4,
        },
        default: {},
      }),
    [colors.accent, isDark]
  );

  const innerTint = isDark ? "rgba(18, 15, 29, 0.78)" : "rgba(255, 255, 255, 0.86)";
  const chevronBg = isDark ? "rgba(42, 36, 61, 0.55)" : "rgba(241, 245, 249, 0.92)";
  const chevronBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(226, 232, 240, 0.9)";
  const avatarRing = isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.35)";

  const body = (
    <View style={styles.row}>
      <View style={styles.avatarCluster}>
        <LinearGradient
          colors={[colors.gradientPrimaryStart, colors.gradientPrimaryMiddle, colors.gradientPrimaryEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarGlow}
        />
        <LinearGradient
          colors={[colors.gradientPrimaryStart, colors.gradientPrimaryMiddle, colors.gradientPrimaryEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.avatarCircle, { borderColor: avatarRing }]}
        >
          <UserIcon size={20} color={colors.onAccent} variant="stroke" strokeWidth={2} />
        </LinearGradient>
      </View>
      <View style={styles.textBlock}>
        <Text unstyled style={[styles.roleLine, { color: colors.accentSecondary }]} numberOfLines={1}>
          {roleLabel}
        </Text>
        <Text unstyled style={[styles.name, { color: colors.textSecondary }]} numberOfLines={1}>
          {displayName}
        </Text>
        {email ? (
          <Text unstyled style={[styles.email, { color: colors.textMuted }]} numberOfLines={1}>
            {email}
          </Text>
        ) : null}
      </View>
      <View
        style={[
          styles.chevronWrap,
          {
            backgroundColor: chevronBg,
            borderColor: chevronBorder,
          },
        ]}
      >
        <ArrowDown01Icon
          size={16}
          color={colors.textSecondary}
          variant="stroke"
          strokeWidth={1.9}
        />
      </View>
    </View>
  );

  return (
    <TouchableOpacity
      activeOpacity={interactive ? 0.92 : 1}
      disabled={!interactive}
      onPress={onPress}
      style={[styles.touchWrap, outerShadow, style]}
    >
      <LinearGradient
        colors={[colors.gradientPrimaryStart, colors.gradientPrimaryMiddle, colors.gradientPrimaryEnd, colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientFrame}
      >
        <BlurView
          intensity={isDark ? 36 : 52}
          tint={isDark ? "dark" : "light"}
          style={styles.blurClip}
        >
          <View style={[styles.innerFill, { backgroundColor: innerTint }]}>{body}</View>
        </BlurView>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchWrap: {
    borderRadius: FRAME_RADIUS,
  },
  gradientFrame: {
    borderRadius: FRAME_RADIUS,
    padding: 1,
  },
  blurClip: {
    borderRadius: INNER_RADIUS,
    overflow: "hidden",
  },
  innerFill: {
    borderRadius: INNER_RADIUS,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarCluster: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarGlow: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    opacity: 0.5,
    transform: [{ scale: 1.06 }],
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  roleLine: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 2,
    opacity: 0.92,
  },
  name: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.25,
  },
  email: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 1,
    opacity: 0.88,
  },
  chevronWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 2,
  },
});
