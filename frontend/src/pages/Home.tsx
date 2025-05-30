import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { postsAPI, tagsAPI } from '../utils/api';
import { Post, Tag } from '../types';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PostCard from '../components/PostCard';

const Home: React.FC = () => {
  const [latestPosts, setLatestPosts] = useState<Post[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalTags: 0,
    totalViews: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);  const fetchData = async () => {
    try {
      const [postsResponse, tagsResponse, allPostsResponse] = await Promise.all([
        postsAPI.getPosts({ limit: 6, published: 'true' }),
        tagsAPI.getTags(),
        postsAPI.getPosts({ published: 'true' }),
      ]);
      
      const posts = postsResponse.data.posts || [];
      const allPosts = allPostsResponse.data.posts || [];
      const tagsData = tagsResponse.data || [];
      
      setLatestPosts(posts);
      setTags(tagsData);
      
      // 计算统计数据
      const totalViews = allPosts.reduce((sum: number, post: Post) => sum + (post.view_count || 0), 0);
      setStats({
        totalPosts: allPosts.length,
        totalTags: tagsData.length,
        totalViews,
      });
    } catch (error) {
      console.error('获取数据失败:', error);
      setLatestPosts([]);
      setTags([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl font-bold mb-6">
              欢迎来到我的博客
            </h1>
            <p className="text-xl sm:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
              分享技术见解、学习经验和生活感悟
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/posts"
                className="inline-flex items-center px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                浏览文章
              </Link>
              <Link
                to="/tags"
                className="inline-flex items-center px-8 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-blue-600 transition-colors"
              >
                查看标签
              </Link>
            </div>
          </div>
        </div>
      </section>      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* 统计卡片 */}
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{stats.totalPosts}</h3>
              <p className="text-gray-600">篇文章</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{stats.totalTags}</h3>
              <p className="text-gray-600">个标签</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{stats.totalViews.toLocaleString()}</h3>
              <p className="text-gray-600">次浏览</p>
            </div>
          </div>
        </section>        {/* 最新文章 */}
        <section>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">最新文章</h2>
            <Link
              to="/posts"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              查看全部 →
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="bg-gray-300 h-48 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : latestPosts && latestPosts.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {latestPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">暂无文章</p>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
