import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'

const API_BASE_URL = '/api/v1'

// 创建 axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

// 请求拦截器 - 添加认证token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token')
    
    // 调试日志：检查Token是否获取成功
    console.log('[API Request] URL:', config.url, 'Token found:', !!token);
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 处理错误
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // 调试日志
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      headers: error.config?.headers
    });

    if (error.response?.status === 401) {
      // 暂时注释掉自动跳转，以便调试
      // Token过期或无效，清除本地存储并跳转登录
      // localStorage.removeItem('access_token')
      // localStorage.removeItem('user')
      // window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient

// 通用的API调用函数
export async function apiGet<T>(url: string, params?: Record<string, any>): Promise<T> {
  const response = await apiClient.get<T>(url, { params })
  return response.data
}

export async function apiPost<T>(url: string, data?: any): Promise<T> {
  const response = await apiClient.post<T>(url, data)
  return response.data
}

export async function apiPut<T>(url: string, data?: any): Promise<T> {
  const response = await apiClient.put<T>(url, data)
  return response.data
}

export async function apiDelete<T>(url: string): Promise<T> {
  const response = await apiClient.delete<T>(url)
  return response.data
}

// 文件上传
export async function uploadFile(file: File): Promise<any> {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await apiClient.post('/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}
