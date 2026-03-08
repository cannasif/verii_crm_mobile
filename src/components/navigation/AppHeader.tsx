import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Menu01Icon, UserIcon } from "hugeicons-react-native";
import { useUIStore } from "../../store/ui";
import { useAuthStore } from "../../store/auth";
import { GRADIENT } from "../../constants/theme";
import ProfilePanel from "./ProfilePanel";
import { profileApi } from "../../features/profile";

export function AppHeader(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { colors, openSidebar, themeMode } = useUIStore();
  const { user, branch, clearAuth } = useAuthStore(); 

  const isDark = themeMode === "dark";

  const THEME = {
    bg: isDark ? "#0c0516" : "#FFFFFF",
    border: isDark ? "rgba(255, 255, 255, 0.08)" : "#F1F5F9",
    iconColor: isDark ? "#F8FAFC" : "#0F172A",
    buttonBg: isDark ? "rgba(255, 255, 255, 0.06)" : "#F8FAFC",
    avatarInnerBg: isDark ? "#0c0516" : "#FFFFFF",
    shadowColor: isDark ? "#000000" : "#64748B",
  };

  const [isProfileOpen, setProfileOpen] = useState(false);

  const userId = user?.id;
  const userDetailQuery = useQuery({
    queryKey: ["profile", "detail", userId],
    queryFn: () => profileApi.getUserDetailByUserId(userId as number),
    enabled: typeof userId === "number" && userId > 0,
  });
  const profileImageUrl = userDetailQuery.data?.profilePictureUrl || undefined;

  const handleProfilePress = () => {
    setProfileOpen(true);
  };

  const handleLogout = () => {
    setProfileOpen(false);
    if (clearAuth) clearAuth();
    router.replace("/login" as never);
  };

  return (
    <>
      <View 
        style={[
          styles.container, 
          { 
            backgroundColor: THEME.bg,
            paddingTop: insets.top + 10,
            borderBottomColor: THEME.border,
            shadowColor: THEME.shadowColor,
          }
        ]}
      >
        <View style={styles.leftContainer}>
          <TouchableOpacity 
            onPress={openSidebar} 
            style={[styles.iconButton, { backgroundColor: THEME.buttonBg }]}
            activeOpacity={0.7}
          >
            <Menu01Icon size={24} color={THEME.iconColor} />
          </TouchableOpacity>
        </View>

        <View style={styles.centerContainer} pointerEvents="none" />

        <View style={styles.rightContainer}>
          <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.8}>
            <LinearGradient
              colors={[...GRADIENT.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarBorder}
            >
              <View style={[styles.avatarInner, { backgroundColor: THEME.avatarInnerBg }]}>
                {profileImageUrl ? (
                  <Image source={{ uri: profileImageUrl }} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <UserIcon size={20} color={THEME.iconColor} />
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <ProfilePanel 
        isOpen={isProfileOpen} 
        onClose={() => setProfileOpen(false)}
        userName={user?.name || "Kullanıcı"}
        email={user?.email}
        branch={branch?.name}
        profileImageUrl={profileImageUrl}
        onLogout={handleLogout}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    zIndex: 50,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    minHeight: 80, 
  },
  leftContainer: {
    flex: 1,
    alignItems: "flex-start",
    zIndex: 20,
  },
  rightContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    zIndex: 20,
  },
  centerContainer: {
    flex: 2,
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  avatarBorder: {
    width: 42,
    height: 42,
    borderRadius: 14,
    padding: 2, 
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInner: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
});
