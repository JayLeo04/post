import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { ThemeProvider } from './contexts/ThemeContext';

// 导入页面组件
import Home from './pages/Home';
import PostList from './pages/PostList';
import PostDetail from './pages/PostDetail';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import PostEditor from './pages/PostEditor';
import TagManager from './pages/TagManager';
import TagsPage from './pages/TagsPage';

// 保护路由组件
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/admin/login" />;
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Router>
        <div className="App">
          <Routes>          {/* 公开路由 */}
            <Route path="/" element={<Home />} />
            <Route path="/posts" element={<PostList />} />
            <Route path="/posts/:id" element={<PostDetail />} />
            <Route path="/tags" element={<TagsPage />} />
            <Route path="/admin/login" element={<AdminLogin />} />
              {/* 管理员路由 */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/posts/new" 
              element={
                <ProtectedRoute>
                  <PostEditor />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/posts/:id/edit" 
              element={
                <ProtectedRoute>
                  <PostEditor />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/tags" 
              element={
                <ProtectedRoute>
                  <TagManager />
                </ProtectedRoute>
              } 
            />
            
            {/* 404 页面 */}
            <Route 
              path="*" 
              element={
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                    <p className="text-gray-600 mb-4">页面不存在</p>
                    <a href="/" className="text-blue-600 hover:text-blue-700">
                      返回首页
                    </a>
                  </div>
                </div>
              } 
            />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
};

export default App;
