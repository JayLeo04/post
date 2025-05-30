import axios from 'axios';
import { Post, PostsResponse, CreatePostData, Tag, LoginData, User, UploadResponse } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// 请求拦截器 - 添加token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

// 认证相关
export const authAPI = {
  login: (data: LoginData) => api.post<{ token: string; user: User }>('/auth/login', data),
  register: (data: { username: string; password: string; email?: string }) => 
    api.post<{ token: string; user: User }>('/auth/register', data),
  changePassword: (data: { current_password: string; new_password: string }) => 
    api.post<{ message: string }>('/change-password', data),
  adminChangeUserPassword: (data: { user_id: number; new_password: string }) => 
    api.post<{ message: string }>('/admin/change-user-password', data),
  getProfile: () => api.get<User>('/profile'),
  getAllUsers: () => api.get<User[]>('/admin/users'),
};

// 博客文章相关
export const postsAPI = {  getPosts: (params?: { page?: number; limit?: number; search?: string; tag?: string; published?: string; sort_by?: string }) =>
    api.get<PostsResponse>('/posts', { params }),
  getPost: (id: number) => api.get<Post>(`/posts/${id}`),
  createPost: (data: CreatePostData) => api.post<Post>('/posts', data),
  updatePost: (id: number, data: Partial<CreatePostData>) => api.put<Post>(`/posts/${id}`, data),
  deletePost: (id: number) => api.delete(`/posts/${id}`),
  likePost: (id: number) => api.post<{message: string; likes: number; liked: boolean}>(`/posts/${id}/like`),
  checkLike: (id: number) => api.get<{liked: boolean}>(`/posts/${id}/like/check`),
};

// 标签相关
export const tagsAPI = {
  getTags: () => api.get<Tag[]>('/tags'),
  createTag: (data: { name: string; color?: string }) => api.post<Tag>('/tags', data),
  updateTag: (id: number, data: { name?: string; color?: string }) => api.put<Tag>(`/tags/${id}`, data),
  deleteTag: (id: number) => api.delete(`/tags/${id}`),
};

// 文件上传
export const uploadAPI = {
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<UploadResponse>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};
