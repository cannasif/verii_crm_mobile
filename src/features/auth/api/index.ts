import { apiClient } from "../../../lib/axios";
import i18next from "i18next";
import type {
  LoginRequest,
  LoginResponse,
  LoginResponseData,
  BranchListResponse,
  Branch,
  BranchErp,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
} from "../types";

const mapBranch = (branch: BranchErp): Branch => ({
  id: String(branch.subeKodu),
  name: branch.unvan && branch.unvan.trim().length > 0 ? branch.unvan : "-",
  code: String(branch.subeKodu),
});

export const authApi = {
  getBranches: async (): Promise<Branch[]> => {
    try {
      const response = await apiClient.get<BranchListResponse>("/api/Erp/getBranches");

      if (!response.data.success) {
        const errorMessage =
          response.data.message ||
          response.data.exceptionMessage ||
          (response.data.errors && response.data.errors.length > 0
            ? response.data.errors.join(", ")
            : i18next.t("api.errors.branchListFailed", "Şube listesi alınamadı"));
        throw new Error(errorMessage);
      }

      return response.data.data.map(mapBranch);
    } catch (error: any) {
      const finalMessage = error.message || i18next.t("api.errors.serverConnection", "Sunucu ile bağlantı kurulamadı.");
      throw new Error(finalMessage);
    }
  },

  login: async (data: LoginRequest): Promise<LoginResponseData> => {
    try {
      const response = await apiClient.post<LoginResponse>("/api/auth/login", data);

      if (!response.data.success) {
        const errorMessage =
          response.data.message ||
          response.data.exceptionMessage ||
          (response.data.errors && response.data.errors.length > 0
            ? response.data.errors.join(", ")
            : i18next.t("auth.loginFailed", "Giriş başarısız"));
        throw new Error(errorMessage);
      }

      return response.data.data;
    } catch (error: any) {
      const finalMessage = error.message || i18next.t("auth.loginFailedMessage", "Giriş başarısız. Lütfen bilgilerinizi kontrol edin.");
      throw new Error(finalMessage);
    }
  },

  requestPasswordReset: async (data: ForgotPasswordRequest): Promise<string> => {
    try {
      const response = await apiClient.post<ForgotPasswordResponse>("/api/auth/request-password-reset", data);

      if (!response.data.success) {
        const errorMessage =
          response.data.message ||
          response.data.exceptionMessage ||
          (response.data.errors && response.data.errors.length > 0
            ? response.data.errors.join(", ")
            : i18next.t("auth.forgotPassword.error", "Password reset request failed."));
        throw new Error(errorMessage);
      }

      return response.data.message || i18next.t("auth.forgotPassword.success", "Password reset link sent.");
    } catch (error: any) {
      const finalMessage =
        error.message || i18next.t("auth.forgotPassword.error", "Password reset request failed.");
      throw new Error(finalMessage);
    }
  },

  resetPassword: async (data: ResetPasswordRequest): Promise<string> => {
    try {
      const response = await apiClient.post<ResetPasswordResponse>("/api/auth/reset-password", data);

      if (!response.data.success) {
        const errorMessage =
          response.data.message ||
          response.data.exceptionMessage ||
          (response.data.errors && response.data.errors.length > 0
            ? response.data.errors.join(", ")
            : i18next.t("auth.resetPassword.error", "Password reset failed."));
        throw new Error(errorMessage);
      }

      return response.data.message || i18next.t("auth.resetPassword.success", "Password reset successful.");
    } catch (error: any) {
      const finalMessage = error.message || i18next.t("auth.resetPassword.error", "Password reset failed.");
      throw new Error(finalMessage);
    }
  },

  changePassword: async (data: ChangePasswordRequest): Promise<string> => {
    try {
      const response = await apiClient.post<ChangePasswordResponse>("/api/auth/change-password", data);

      if (!response.data.success) {
        const errorMessage =
          response.data.message ||
          response.data.exceptionMessage ||
          (response.data.errors && response.data.errors.length > 0
            ? response.data.errors.join(", ")
            : i18next.t("auth.changePassword.error", "Password change failed."));
        throw new Error(errorMessage);
      }

      const newToken = response.data.data;
      if (!newToken) {
        throw new Error(i18next.t("auth.changePassword.error", "Password change failed."));
      }

      return newToken;
    } catch (error: any) {
      const finalMessage = error.message || i18next.t("auth.changePassword.error", "Password change failed.");
      throw new Error(finalMessage);
    }
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post("/api/auth/logout");
    } catch {
    }
  },
};
