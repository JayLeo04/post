import { useState, useEffect } from 'react';
import { authAPI } from '../utils/api';
import { User } from '../types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authAPI.getProfile()
        .then(response => {
          setUser(response.data);
        })
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await authAPI.login({ username, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      return true;
    } catch (error) {
      return false;
    }
  };

  const register = async (username: string, password: string, email?: string) => {
    try {
      const response = await authAPI.register({ username, password, email });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        message: error.response?.data?.error || '注册失败，请稍后重试'
      };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await authAPI.changePassword({ 
        current_password: currentPassword, 
        new_password: newPassword
      });
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        message: error.response?.data?.error || '修改密码失败，请稍后重试'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return {
    user,
    loading,
    login,
    register,
    changePassword,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.user_type === 'admin',
  };
};
