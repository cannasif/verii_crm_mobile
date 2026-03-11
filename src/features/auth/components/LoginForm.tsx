import React, { useState, useMemo } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import {
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
  Pressable,
  Alert,
} from "react-native";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { VStack } from "../../../components/ui/vstack";
import { Text } from "../../../components/ui/text";
import {
  FormControl,
  FormControlError,
  FormControlErrorText,
} from "../../../components/ui/form-control";
import {
  Location01Icon,
  Mail02Icon,
  LockKeyIcon,
  ViewIcon,
  ViewOffIcon,
  Tick02Icon,
  ArrowDown01Icon,
  Alert02Icon,
} from "hugeicons-react-native";

import { useLogin } from "../hooks/useLogin";
import { useBranches } from "../hooks/useBranches";
import { createLoginSchema, type LoginFormData } from "../schemas";
import type { Branch } from "../types";

const COLORS = {
  inputBg: "#15111D",
  prefixBg: "rgba(255, 255, 255, 0.03)", 
  border: "rgba(255, 255, 255, 0.08)",
  placeholder: "#64748b", 
  pink: "#ec4899", 
};

const CustomCheckbox = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <Pressable 
    onPress={onChange}
    className={`w-5 h-5 rounded md items-center justify-center border ${
      checked ? "bg-[#ec4899] border-[#ec4899]" : "bg-transparent border-white/20"
    }`}
  >
    {checked && <Tick02Icon size={14} color="white" strokeWidth={4} />}
  </Pressable>
);


function BranchItem({ item, isSelected, onSelect }: { item: Branch; isSelected: boolean; onSelect: (b: Branch) => void }) {
  return (
    <Pressable
      onPress={() => onSelect(item)}
      className={`flex-row items-center justify-between py-3.5 px-4 rounded-xl mb-2.5 border ${
        isSelected ? "bg-[#ec4899]/10 border-[#ec4899]/50" : "bg-white/5 border-white/5"
      }`}
    >
      <Text className={`text-[14px] ${isSelected ? "text-[#ec4899] font-bold" : "text-slate-200"}`}>
        {item.name}
      </Text>
      {isSelected && <Tick02Icon size={18} color="#ec4899" />}
    </Pressable>
  );
}

export function LoginForm(): React.ReactElement {
  const { t } = useTranslation();
  const { login, isLoading, error } = useLogin();
  const { branches, isLoading: isBranchesLoading } = useBranches();

  const [showPassword, setShowPassword] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const loginSchema = useMemo(() => createLoginSchema(), []);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema) as Resolver<LoginFormData>,
    mode: "onBlur",
    defaultValues: {
      branchId: "",
      email: "",
      password: "",
      rememberMe: true,
    },
  });


  const handleForgotPass = () => {
    router.push("/(auth)/forgot-password");
  };

  const onSubmit = (data: LoginFormData) => {
  
    if (!selectedBranch) {
      Alert.alert(
        t("common.warning", "Uyarı"), 
        t("auth.selectBranchWarning", "Lütfen giriş yapmak için bir şube seçiniz.")
      );
      return;
    }
    

    login(
      { loginData: data, branch: selectedBranch }, 
      { 
        onSuccess: () => {
          router.replace("/(tabs)");
        },
        onError: (err: any) => {
          const errorMessage = err?.message || t("auth.invalidCredentials", "E-posta veya şifre hatalı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.");
          Alert.alert(t("auth.loginFailed", "Giriş Başarısız"), errorMessage);
        }
      }
    );
  };

  const onInvalidSubmit = () => {
    Alert.alert(
      t("common.warning", "Uyarı"),
      t("validation.fillRequiredFields", "Lütfen zorunlu alanları doldurun")
    );
  };

  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranch(branch);
    setValue("branchId", branch.id, { shouldValidate: true });
    setShowBranchModal(false);
  };


  const getInputWrapperClasses = (hasError: boolean, isFocused: boolean) => {
    const base = "flex-row items-center bg-[#15111D] border rounded-xl h-[52px] overflow-hidden";
    if (hasError) return `${base} border-red-500/50`;
    if (isFocused) return `${base} border-[#ec4899]/50`;
    return `${base} border-white/10`;
  };

  const getIconColor = (hasError: boolean, isFocused: boolean) => {
    if (hasError) return "#f87171"; 
    if (isFocused) return "#ec4899"; 
    return "#64748b"; 
  };

  return (
    <VStack space="lg" className="w-full">
          <View className="items-center mb-2">
        <Text className="text-slate-400 text-[10px] font-bold tracking-[3px] uppercase">
          {t("auth.login.subtitle", "SATIŞ & MÜŞTERİ YÖNETİMİ")}
        </Text>
      </View>

      <VStack space="md">
        
        <FormControl isInvalid={!!errors.branchId}>
          <Controller
            control={control}
            name="branchId"
            render={() => {
              const hasError = !!errors.branchId;
              const isFocused = showBranchModal;
              return (
                <Pressable
                  onPress={() => !isBranchesLoading && setShowBranchModal(true)}
                  className={getInputWrapperClasses(hasError, isFocused)}
                >
                 
                  <View className="w-[52px] h-full items-center justify-center bg-white/5 border-r border-white/5">
                    <Location01Icon size={20} color={getIconColor(hasError, isFocused)} />
                  </View>
                  <View className="flex-1 px-4 justify-center">
                    {isBranchesLoading ? (
                      <Text className="text-slate-500 text-[14px]">{t("common.loading", "Yükleniyor...")}</Text>
                    ) : (
                      <Text className={`text-[14px] ${selectedBranch ? "text-white" : "text-slate-400"}`}>
                        {selectedBranch ? selectedBranch.name : t("auth.login.branchSelect", "Şube Seçiniz")}
                      </Text>
                    )}
                  </View>
                  <View className="pr-4">
                    <ArrowDown01Icon size={16} color="#64748b" />
                  </View>
                </Pressable>
              );
            }}
          />
          {errors.branchId && (
            <FormControlError>
               <FormControlErrorText className="text-red-400 text-[11px] ml-1 mt-1">
                 {errors.branchId.message}
               </FormControlErrorText>
            </FormControlError>
          )}
        </FormControl>

  
        <FormControl isInvalid={!!errors.email}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => {
              const hasError = !!errors.email;
              const isFocused = focusedInput === "email";
              return (
                <View className={getInputWrapperClasses(hasError, isFocused)}>
                  <View className="w-[52px] h-full items-center justify-center bg-white/5 border-r border-white/5">
                    <Mail02Icon size={20} color={getIconColor(hasError, isFocused)} />
                  </View>
                  <TextInput
                    className="flex-1 px-4 text-[14px] text-white h-full"
                    placeholder={t("auth.login.emailPlaceholder", "Kurumsal E-posta")}
                    placeholderTextColor={COLORS.placeholder}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onFocus={() => setFocusedInput("email")}
                    onBlur={() => { setFocusedInput(null); onBlur(); }}
                    onChangeText={onChange}
                    value={value}
                  />
                </View>
              );
            }}
          />
          {errors.email && (
            <FormControlError>
               <FormControlErrorText className="text-red-400 text-[11px] ml-1 mt-1">
                 {errors.email.message}
               </FormControlErrorText>
            </FormControlError>
          )}
        </FormControl>

        <FormControl isInvalid={!!errors.password}>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => {
              const hasError = !!errors.password;
              const isFocused = focusedInput === "password";
              return (
                <View className={getInputWrapperClasses(hasError, isFocused)}>
                  <View className="w-[52px] h-full items-center justify-center bg-white/5 border-r border-white/5">
                    <LockKeyIcon size={20} color={getIconColor(hasError, isFocused)} />
                  </View>
                  <TextInput
                    className="flex-1 pl-4 pr-2 text-[14px] text-white h-full"
                    placeholder={t("auth.login.passwordPlaceholder", "Şifre")}
                    placeholderTextColor={COLORS.placeholder}
                    secureTextEntry={!showPassword}
                    onFocus={() => setFocusedInput("password")}
                    onBlur={() => { setFocusedInput(null); onBlur(); }}
                    onChangeText={onChange}
                    value={value}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} className="w-12 h-full items-center justify-center">
                    {showPassword ? (
                      <ViewOffIcon size={18} color="#64748b" />
                    ) : (
                      <ViewIcon size={18} color="#64748b" />
                    )}
                  </Pressable>
                </View>
              );
            }}
          />
          {errors.password && (
            <FormControlError>
               <FormControlErrorText className="text-red-400 text-[11px] ml-1 mt-1">
                 {errors.password.message}
               </FormControlErrorText>
            </FormControlError>
          )}
        </FormControl>
        <Controller
          control={control}
          name="rememberMe"
          render={({ field: { onChange, value } }) => (
            <View className="flex-row justify-between items-center mt-1 px-1">
              <Pressable onPress={() => onChange(!value)} className="flex-row items-center gap-2.5">
                <CustomCheckbox checked={value} onChange={() => onChange(!value)} />
                <Text className="text-[13px] text-slate-300 font-medium">
                  {t("auth.login.rememberMe", "Beni Hatırla")}
                </Text>
              </Pressable>
              
              <Pressable onPress={handleForgotPass}>
                <Text className="text-[13px] text-[#ec4899] font-medium opacity-90">
                  {t("auth.forgotPassword.title", "Şifremi Unuttum?")}
                </Text>
              </Pressable>
            </View>
          )}
        />
      </VStack>

      {error && (
        <View className="flex-row items-center bg-red-500/10 rounded-xl p-3 mt-1 border border-red-500/20">
          <Alert02Icon size={18} color="#f87171" />
          <Text className="text-red-300 text-[12px] ml-2 flex-1">
            {error.message || t("auth.login.errorMessage", "Giriş yapılamadı, lütfen tekrar deneyin.")}
          </Text>
        </View>
      )}

      <TouchableOpacity
        onPress={handleSubmit(onSubmit, onInvalidSubmit)}
        disabled={isLoading || isBranchesLoading}
        activeOpacity={0.8}
        className="mt-4 rounded-xl overflow-hidden shadow-lg shadow-pink-500/20" 
        style={{ elevation: 5 }}
      >
        <LinearGradient
          colors={['#ec4899', '#f97316']} 
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="h-[52px] items-center justify-center"
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-[14px] font-bold tracking-[1.5px] uppercase">
              {t("auth.login.submitButton", "GİRİŞ YAP")}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <Modal
        visible={showBranchModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBranchModal(false)}
      >
        <Pressable 
          className="flex-1 bg-black/70 justify-end"
          onPress={() => setShowBranchModal(false)}
        >
          <Pressable 
            className="bg-[#15111D] rounded-t-[28px] px-6 pb-10 pt-4 max-h-[70%] border-t border-white/10"
            onPress={(e) => e.stopPropagation()} 
          >
            <View className="w-12 h-1.5 bg-white/10 rounded-full self-center mb-6" />
            <Text className="text-[16px] font-bold text-white text-center mb-5 tracking-wide">
              {t("auth.login.branchSelect", "Şube Seçiniz")}
            </Text>
            
            <FlatList
              data={branches}
              renderItem={({ item }) => (
                <BranchItem 
                  item={item} 
                  isSelected={selectedBranch?.id === item.id} 
                  onSelect={handleBranchSelect} 
                />
              )}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </VStack>
  );
}
