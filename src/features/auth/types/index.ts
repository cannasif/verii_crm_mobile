export interface ApiResponse<T> {
  success: boolean;
  message: string;
  exceptionMessage: string;
  data: T;
  errors: string[];
  timestamp: string;
  statusCode: number;
  className: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role?: string;
}

export interface BranchErp {
  subeKodu: number;
  unvan: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
}

export type BranchListResponse = ApiResponse<BranchErp[]>;

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface LoginResponseData {
  token: string;
  userId: number;
  sessionId: string;
  rememberMe: boolean;
}

export type LoginResponse = ApiResponse<LoginResponseData>;
export type ForgotPasswordResponse = ApiResponse<string>;
export type ResetPasswordResponse = ApiResponse<boolean>;
export type ChangePasswordResponse = ApiResponse<string>;

export interface JWTPayload {
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier": string;
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress": string;
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name": string;
  firstName?: string;
  lastName?: string;
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"?: string;
  exp: number;
  iss: string;
  aud: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  branch: Branch | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
}
