import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';

interface HeaderProps {
  isAdmin?: boolean;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ isAdmin, onLogout }) => {
  const { isAuthenticated, logout: authLogout } = useAuth();
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-gray-900">
              我的博客
            </Link>
          </div>

          <nav className="hidden md:flex space-x-8">
            <Link to="/" className="text-gray-700 hover:text-gray-900 transition-colors">
              首页
            </Link>
            <Link to="/posts" className="text-gray-700 hover:text-gray-900 transition-colors">
              文章
            </Link>            <Link to="/tags" className="text-gray-700 hover:text-gray-900 transition-colors">
              标签
            </Link>
            {(isAdmin || isAuthenticated) ? (
              <>
                <Link to="/admin" className="text-blue-600 hover:text-blue-700 transition-colors">
                  管理后台
                </Link>
                <button
                  onClick={onLogout || authLogout}
                  className="text-gray-700 hover:text-gray-900 transition-colors"
                >
                  退出登录
                </button>
              </>
            ) : (
              <Link to="/admin/login" className="text-blue-600 hover:text-blue-700 transition-colors">
                管理员登录
              </Link>
            )}
          </nav>

          {/* 移动端菜单按钮 */}
          <div className="md:hidden">
            <button className="text-gray-700 hover:text-gray-900">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
