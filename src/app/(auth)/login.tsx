import React, { useState, useEffect } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  View,
  TouchableOpacity,
  Pressable,
  Linking,
  LogBox,
  Image,
  Alert,
  useWindowDimensions,
  Dimensions,
} from "react-native";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation, Trans } from "react-i18next";
import { Text } from "../../components/ui/text";

import { LoginForm } from "../../features/auth";
import { setLanguage, getCurrentLanguage, SUPPORTED_LANGUAGE_CODES, type AppLanguage } from "../../locales";

import {
  Call02Icon,
  Globe02Icon,
  Mail02Icon,
  WhatsappIcon,
  TelegramIcon,
  InstagramIcon,
  NewTwitterIcon,
} from "hugeicons-react-native";

const SocialButton = ({
  icon: Icon,
  color,
  onPress,
}: {
  icon: any;
  color: string;
  onPress: () => void;
}) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: pressed ? color : "rgba(255, 255, 255, 0.15)",
        backgroundColor: pressed ? `${color}20` : "transparent",
        transform: [{ scale: pressed ? 0.92 : 1 }],
      })}
    >
      {({ pressed }) => (
        <Icon size={22} color={pressed ? color : "#94a3b8"} />
      )}
    </Pressable>
  );
};

export default function LoginScreen(): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { width } = useWindowDimensions(); 
  const SCREEN_HEIGHT = Dimensions.get("screen").height; 

  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());

  useEffect(() => {
    LogBox.ignoreLogs([
      'A props object containing a "key" prop is being spread into JSX',
    ]);
  }, []);

  const toggleLanguage = async (): Promise<void> => {
    const currentIndex = SUPPORTED_LANGUAGE_CODES.indexOf((currentLang as AppLanguage) || "tr");
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const newLang = SUPPORTED_LANGUAGE_CODES[(safeIndex + 1) % SUPPORTED_LANGUAGE_CODES.length];
    await setLanguage(newLang);
    setCurrentLang(newLang);
  };

  const openLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t("common.error"), t("auth.linkError"));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleComingSoon = () => {
    Alert.alert(t("common.info"), t("common.comingSoon"));
  };

  const safeBottomPadding = Math.max(insets.bottom + 20, 40);

  return (
    <>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: "#0f0518" }}>

        <View 
          style={{
            position: 'absolute',
            top: -100,
            alignSelf: 'center',
            width: 400,
            height: 400,
            borderRadius: 200,
            backgroundColor: '#ec4899', 
            opacity: 0.05, 
            transform: [{ scaleX: 1.5 }]
          }} 
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <FlatListScrollView
            contentContainerStyle={{ 
                flexGrow: 1, 
                justifyContent: "space-between",
                minHeight: SCREEN_HEIGHT, 
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
           
          <View 
              className="px-6 items-end z-20" 
              style={{ paddingTop: Math.max(insets.top + 15, 30) }}
            >
              <TouchableOpacity
                className="px-4 py-1.5 rounded-full border border-white/20 bg-white/5"
                onPress={toggleLanguage}
                activeOpacity={0.7}
              >
                <Text className="text-[11px] font-[800] text-slate-300 tracking-[1.5px]">
                  {String(currentLang || "tr").toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>

           
            <View style={{ alignItems: "center", zIndex: 20, marginTop: -8, marginBottom: -32 }}>
              <Image
                source={require("../../../assets/veriicrmlogo.png")}
                style={{ width: 300, height: 150 }}
                resizeMode="contain"
              />
            </View>

              <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 20, marginVertical: 8, zIndex: 20 }}>
              <View 
                style={{ 
                  backgroundColor: "#130b1b",
                  borderRadius: 32,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.05)",
                  paddingVertical: 40,
                  paddingHorizontal: 24,
                  shadowColor: "#ec4899",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.1,
                  shadowRadius: 20,
                  elevation: 5 
                }}
              >
                <LoginForm />
              </View>
            </View>

            <View
              style={{ alignItems: "center", zIndex: 20, marginTop: 16, paddingBottom: safeBottomPadding }}
            >
              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 16, paddingHorizontal: 16, marginBottom: 20 }}>
                <SocialButton icon={Call02Icon} color="#bef264" onPress={() => openLink("tel:+905070123018")} />
                <SocialButton icon={Globe02Icon} color="#f472b6" onPress={() => openLink("https://v3rii.com")} />
                <SocialButton icon={Mail02Icon} color="#fb923c" onPress={() => openLink("mailto:info@v3rii.com")} />
                <SocialButton icon={WhatsappIcon} color="#34d399" onPress={() => openLink("https://wa.me/905070123018")} />
                <SocialButton icon={TelegramIcon} color="#38bdf8" onPress={handleComingSoon} />
                <SocialButton icon={InstagramIcon} color="#e879f9" onPress={handleComingSoon} />
                <SocialButton icon={NewTwitterIcon} color="#ffffff" onPress={handleComingSoon} />
              </View>

                <View style={{ paddingHorizontal: 28 }}>
                <Text className="text-[10px] color-slate-400 text-center font-semibold tracking-[2px] uppercase leading-5">
                  <Trans
                    i18nKey="auth.login.slogan"
                    components={{
                      1: <Text className="font-extrabold text-pink-500 tracking-[3px]" />,
                    }}
                  />
                </Text>
              </View>
            </View>
          </FlatListScrollView>
        </KeyboardAvoidingView>
      </View>
    </>
  );
}
