import React, { useEffect, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useCreateTitle, useUpdateTitle } from "../hooks";
import { createTitleSchema, type TitleFormData } from "../schemas";
import type { TitleDto } from "../types";
import { 
  Cancel01Icon, 
  Award01Icon 
} from "hugeicons-react-native";

interface TitleFormModalProps {
  visible: boolean;
  onClose: () => void;
  title?: TitleDto | null;
}

export function TitleFormModal({
  visible,
  onClose,
  title,
}: TitleFormModalProps): React.ReactElement {
  const { t } = useTranslation();
  const { colors, themeMode } = useUIStore();
  const insets = useSafeAreaInsets();
  const createTitle = useCreateTitle();
  const updateTitle = useUpdateTitle();

  const isDark = themeMode === "dark";
  const primaryColor = "#db2777";
  const isEditMode = !!title;

  const THEME = {
    cardBg: isDark ? "#1a1625" : "#FFFFFF",
    inputBg: isDark ? "rgba(255, 255, 255, 0.03)" : "#F8FAFC",
    border: isDark ? "rgba(219, 39, 119, 0.2)" : "rgba(0, 0, 0, 0.08)",
  };

  const schema = useMemo(() => createTitleSchema(), []);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TitleFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      titleName: "",
      code: "",
    },
  });

  useEffect(() => {
    if (title) {
      reset({
        titleName: title.titleName,
        code: title.code || "",
      });
    } else {
      reset({
        titleName: "",
        code: "",
      });
    }
  }, [title, reset, visible]);

  const onSubmit = useCallback(
    async (data: TitleFormData) => {
      try {
        if (isEditMode && title) {
          await updateTitle.mutateAsync({
            id: title.id,
            data: {
              titleName: data.titleName,
              code: data.code || undefined,
            },
          });
        } else {
          await createTitle.mutateAsync({
            titleName: data.titleName,
            code: data.code || undefined,
          });
        }
        onClose();
      } catch (error) {}
    },
    [isEditMode, title, createTitle, updateTitle, onClose]
  );

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      reset();
      onClose();
    }
  }, [isSubmitting, reset, onClose]);

  const onInvalidSubmit = useCallback(() => {
    Alert.alert(
      t("common.warning"),
      t("validation.fillRequiredFields", "Lütfen zorunlu alanları doldurun")
    );
  }, [t]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.modalBackdrop} 
          activeOpacity={1} 
          onPress={handleClose} 
        />
        
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardView}
        >
          <View style={[styles.modalContent, { backgroundColor: THEME.cardBg, paddingBottom: insets.bottom + 10 }]}>
            
            <View style={[styles.modalHeader, { borderBottomColor: THEME.border }]}>
              <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
              
              <View style={styles.headerTitleRow}>
                <View style={[styles.titleIconBox, { backgroundColor: isDark ? 'rgba(219, 39, 119, 0.15)' : '#FFF1F2' }]}>
                  <Award01Icon size={20} color={primaryColor} variant="stroke" />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {isEditMode ? t("titleManagement.edit") : t("titleManagement.create")}
                </Text>
                
                <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                  <Cancel01Icon size={22} color={colors.textMuted} variant="stroke" />
                </TouchableOpacity>
              </View>
            </View>

            <FlatListScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.form}>
                <Controller
                  control={control}
                  name="titleName"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.field}>
                      <View style={styles.labelRow}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>
                          {t("titleManagement.titleName")}
                        </Text>
                        <Text style={{ color: primaryColor, marginLeft: 4 }}>*</Text>
                      </View>
                      
                      <View style={[
                        styles.inputWrapper,
                        {
                          backgroundColor: THEME.inputBg,
                          borderColor: errors.titleName ? colors.error : THEME.border,
                        }
                      ]}>
                        <TextInput
                          style={[styles.input, { color: colors.text }]}
                          value={value}
                          onChangeText={onChange}
                          placeholder={t("titleManagement.titleNamePlaceholder")}
                          placeholderTextColor={colors.textMuted}
                          maxLength={100}
                        />
                      </View>
                      {errors.titleName && (
                        <Text style={[styles.errorText, { color: colors.error }]}>
                          {errors.titleName.message}
                        </Text>
                      )}
                    </View>
                  )}
                />

                <Controller
                  control={control}
                  name="code"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.textSecondary }]}>
                        {t("titleManagement.code")}
                      </Text>
                      <View style={[
                        styles.inputWrapper,
                        {
                          backgroundColor: THEME.inputBg,
                          borderColor: errors.code ? colors.error : THEME.border,
                        }
                      ]}>
                        <TextInput
                          style={[styles.input, { color: colors.text }]}
                          value={value}
                          onChangeText={onChange}
                          placeholder={t("titleManagement.codePlaceholder")}
                          placeholderTextColor={colors.textMuted}
                          maxLength={10}
                        />
                      </View>
                    </View>
                  )}
                />
              </View>
            </FlatListScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: THEME.border }]}
                onPress={handleClose}
                disabled={isSubmitting}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSubmit(onSubmit, onInvalidSubmit)}
                disabled={isSubmitting}
                style={styles.submitBtnContainer}
              >
                <LinearGradient
                  colors={['#f472b6', '#db2777']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitBtnGradient}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {isEditMode ? t("common.update") : t("common.save")}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  keyboardView: {
    width: '100%',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    width: "100%",
  },
  modalHeader: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  titleIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    flex: 1,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    maxHeight: 400,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  form: {
    padding: 24,
    gap: 16,
  },
  field: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    borderWidth: 1.5,
    borderRadius: 16,
    minHeight: 52,
    justifyContent: "center",
  },
  input: {
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '600',
    width: "100%",
  },
  errorText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 10,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 16,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  submitBtnContainer: {
    flex: 2,
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
  },
  submitBtnGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
