import apiClient from './client';

export interface FileRecord {
  id: string;
  name: string;
  original_name: string;
  url: string;
  file_type?: string;
  mime_type?: string;
  size?: number;
  user_id: string;
  created_at: string;
}

export interface FileUploadResponse {
  success: boolean;
  file?: FileRecord;
  error?: string;
}

export const filesApi = {
  upload: async (file: File): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
