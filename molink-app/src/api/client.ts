import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
export const BASE_URL = API_BASE_URL.replace('/api/v1', '');

/**
 * 将后端返回的文件URL转为可访问的完整URL
 * - 完整URL（http）与 data:/blob:（未登录时的 base64 封面等）直接返回
 * - 相对路径（/uploads/...）拼后端基础域名；开发环境 BASE_URL 为空，
 *   保持同源相对路径，由 vite 代理转发
 */
export function getFileUrl(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  // 相对路径，拼接后端域名
  const prefix = url.startsWith('/') ? '' : '/';
  return `${BASE_URL}${prefix}${url}`;
}

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// 请求拦截器 - 添加认证token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 只有"带 token 的请求被拒"才视为登录态过期。
    // 登录/注册等免鉴权接口的 401（密码错误等）不在此列，
    // 否则会误清 token 并广播 auth_expired，把已登录用户带下线
    const status = error.response?.status;
    const hadToken = !!error.config?.headers?.Authorization;
    if (status === 401 && hadToken) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('molink:auth_expired'));
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// 通用的API调用函数
export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const response = await apiClient.get<T>(url, { params });
  return response.data;
}

export async function apiPost<T>(url: string, data?: unknown): Promise<T> {
  const response = await apiClient.post<T>(url, data);
  return response.data;
}

export async function apiPut<T>(url: string, data?: unknown): Promise<T> {
  const response = await apiClient.put<T>(url, data);
  return response.data;
}

export async function apiDelete<T>(url: string): Promise<T> {
  const response = await apiClient.delete<T>(url);
  return response.data;
}
