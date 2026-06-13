import { useCallback, useEffect, useMemo } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";

import { useAuthStore } from "../../../store/auth";
import { useToast } from "../../../hooks/useToast";
import { profileApi } from "../api/profileApi";
import { createUserDetailSchema, parseUserDetailForm, type UserDetailFormData } from "../schemas/userDetailSchema";
import { useSaveUserDetail } from "./useSaveUserDetail";
import { useUserDetailByUserId } from "./useUserDetailByUserId";
import type { UserDetailProfile } from "../types";

function mapDetailToForm(detail: UserDetailProfile | null | undefined): UserDetailFormData {
  return {
    height: detail?.height != null ? String(detail.height) : "",
    weight: detail?.weight != null ? String(detail.weight) : "",
    gender: detail?.gender != null ? String(detail.gender) : "",
    phoneNumber: detail?.phoneNumber ?? "",
    email: detail?.email ?? "",
    linkedinUrl: detail?.linkedinUrl ?? "",
    description: detail?.description ?? "",
  };
}

export function useProfileSettingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const authUser = useAuthStore((state) => state.user);
  const branch = useAuthStore((state) => state.branch);

  const myProfileQuery = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => profileApi.getMyProfile(),
    staleTime: 5 * 60 * 1000,
  });

  const userId = myProfileQuery.data?.id ?? authUser?.id ?? null;
  const userDetailQuery = useUserDetailByUserId(userId);
  const saveUserDetailMutation = useSaveUserDetail();

  const schema = useMemo(() => createUserDetailSchema(), [i18n.language]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UserDetailFormData>({
    resolver: zodResolver(schema) as never,
    defaultValues: mapDetailToForm(undefined),
  });

  useEffect(() => {
    if (userDetailQuery.isSuccess) {
      reset(mapDetailToForm(userDetailQuery.data));
    }
  }, [userDetailQuery.data, userDetailQuery.isSuccess, reset]);

  const uploadPictureMutation = useMutation({
    mutationFn: async (uri: string) => {
      if (!userId) throw new Error(t("settings.errorNoUser"));
      return profileApi.uploadProfilePicture(userId, uri);
    },
    onSuccess: () => {
      if (userId) {
        userDetailQuery.refetch();
      }
      showSuccess(t("settings.successPhoto"));
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : t("settings.errorPhoto"));
    },
  });

  const fullName = useMemo(() => {
    const apiName = myProfileQuery.data?.fullName?.trim();
    if (apiName) return apiName;
    return authUser?.name || t("settings.defaultUser");
  }, [myProfileQuery.data?.fullName, authUser?.name, t]);

  const loginEmail = myProfileQuery.data?.email || authUser?.email || "-";
  const profileImageUrl = userDetailQuery.data?.profilePictureUrl || undefined;

  const handleOpenChangePassword = useCallback(() => {
    router.push("/(auth)/change-password");
  }, [router]);

  const handleLogout = useCallback(() => {
    Alert.alert(t("common.logout"), "", [
      { text: t("profile.cancel"), style: "cancel" },
      {
        text: t("common.logout"),
        style: "destructive",
        onPress: () => {
          clearAuth();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }, [clearAuth, router, t]);

  const handlePickProfileImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showError(t("settings.errorGallery"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.length) return;
    uploadPictureMutation.mutate(result.assets[0].uri);
  }, [showError, t, uploadPictureMutation]);

  const onSubmit = handleSubmit(async (values) => {
    if (!userId) {
      showError(t("settings.errorNoUser"));
      return;
    }

    try {
      const payload = parseUserDetailForm(values);
      await saveUserDetailMutation.mutateAsync({
        userId,
        userDetail: userDetailQuery.data,
        payload,
      });
      showSuccess(
        userDetailQuery.data?.id
          ? t("profileDetail.updateSuccess")
          : t("profileDetail.createSuccess"),
      );
    } catch (error) {
      showError(error instanceof Error ? error.message : t("profileDetail.saveError"));
    }
  });

  return {
    control,
    errors,
    isDirty,
    fullName,
    loginEmail,
    branchName: branch?.name,
    profileImageUrl,
    isLoadingDetail: userDetailQuery.isLoading,
    isSaving: saveUserDetailMutation.isPending,
    isUploadingPhoto: uploadPictureMutation.isPending,
    handleOpenChangePassword,
    handleLogout,
    handlePickProfileImage,
    onSubmit,
  };
}
