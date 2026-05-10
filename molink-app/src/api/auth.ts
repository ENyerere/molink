import { apiPost, apiGet } from './client';

export interface AuthToken {
  access_token: string;
  token_type: string;
  user: BackendUser;
}

export interface BackendUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  is_active: boolean;
  is_admin?: boolean;
  created_at: string;
  updated_at: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  full_name?: string;
}

export const authApi = {
  login: async (data: LoginData): Promise<AuthToken> => {
    return apiPost<AuthToken>('/auth/login', data);
  },

  register: async (data: RegisterData): Promise<AuthToken> => {
    return apiPost<AuthToken>('/auth/register', data);
  },

  logout: async (): Promise<void> => {
    await apiPost('/auth/logout');
  },

  getCurrentUser: async (): Promise<BackendUser> => {
    return apiGet<BackendUser>('/auth/me');
  },
};
