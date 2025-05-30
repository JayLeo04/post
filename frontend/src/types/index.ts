export interface Post {
  id: number;
  title: string;
  content: string;
  summary: string;
  cover_image: string;
  published: boolean;
  view_count: number;
  likes: number;
  created_at: string;
  updated_at: string;
  tags: Tag[];
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  avatar: string;
  user_type: string;
  created_at: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface PostsResponse {
  posts: Post[];
  total: number;
  page: number;
  limit: number;
}

export interface CreatePostData {
  title: string;
  content: string;
  summary: string;
  cover_image: string;
  published: boolean;
  tag_names: string[];
}

export interface UploadResponse {
  url: string;
  filename: string;
  size: number;
}
