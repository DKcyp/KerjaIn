// SSO Type Definitions

export interface SSOLoginRequest {
  username: string;
  password: string;
  otp?: string;
  client_public_ip?: string;
}

export interface SSOLoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: SSOUser;
}

export interface SSOUser {
  username: string;
  role_id: string;
  role_name: string;
  role: string;
  companyId: string;
  id_departemen: string;
  company_id: string;
  // TODO: Add these fields when SSO server provides them
  // full_name?: string;
  // nama_lengkap?: string;
  // display_name?: string;
}

export interface SSORefreshRequest {
  refresh_token: string;
}

export interface SSORefreshResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface SSOLogoutRequest {
  refresh_token: string;
}

export interface SSOUserProfileResponse {
  username: string;
  role_id: string;
  role_name: string;
  role: string;
  companyId: string;
  id_departemen: string;
  company_id: string;
  // TODO: Add these fields when SSO server provides them
  // full_name?: string;
  // nama_lengkap?: string;
  // display_name?: string;
}
