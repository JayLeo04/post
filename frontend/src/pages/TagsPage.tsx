import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tagsAPI, postsAPI } from '../utils/api';
import { Tag } from '../types';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface TagWithCount extends Tag {
  post_count: number;
}

const TagsPage: React.FC = () => {
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTagsWithCount();
  }, []);

  const fetchTagsWithCount = async () => {
    try {
      setLoading(true);
      const tagsResponse = await tagsAPI.getTags();
      const allTags = tagsResponse.data || [];
      
      // 为每个标签获取文章数量
      const tagsWithCount = await Promise.all(
        allTags.map(async (tag) => {
          try {
            const postsResponse = await postsAPI.getPosts({ 
              tag: tag.name, 
              published: 'true',
              limit: 1 // 只需要获取总数，不需要实际文章数据
            });
            return {
              ...tag,
              post_count: postsResponse.data.total || 0
            };
          } catch (error) {
            console.error(`获取标签 ${tag.name} 的文章数量失败:`, error);
            return {
              ...tag,
              post_count: 0
            };
          }
        })
      );

      // 按文章数量排序
      tagsWithCount.sort((a, b) => b.post_count - a.post_count);
      setTags(tagsWithCount);
    } catch (error) {
      console.error('获取标签失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">所有标签</h1>
          <p className="text-gray-600 mb-6">
            浏览所有标签，点击标签查看相关文章
          </p>
          
          {/* 搜索框 */}
          <div className="max-w-md">
            <input
              type="text"
              placeholder="搜索标签..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="h-6 bg-gray-300 rounded mb-3"></div>
                <div className="h-4 bg-gray-300 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : filteredTags.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredTags.map((tag) => (
                <Link
                  key={tag.id}
                  to={`/posts?tag=${tag.name}`}
                  className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </span>
                    <svg 
                      className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-gray-600 text-sm">
                    {tag.post_count} 篇文章
                  </p>
                </Link>
              ))}
            </div>

            {/* 统计信息 */}
            <div className="mt-8 bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">标签统计</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{tags.length}</div>
                  <div className="text-sm text-gray-600">总标签数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {tags.reduce((sum, tag) => sum + tag.post_count, 0)}
                  </div>
                  <div className="text-sm text-gray-600">总文章数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(tags.reduce((sum, tag) => sum + tag.post_count, 0) / Math.max(tags.length, 1) * 10) / 10}
                  </div>
                  <div className="text-sm text-gray-600">平均文章/标签</div>
                </div>
              </div>
            </div>

            {/* 热门标签 */}
            {tags.length > 0 && (
              <div className="mt-8 bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">热门标签</h2>
                <div className="flex flex-wrap gap-2">
                  {tags.slice(0, 10).map((tag) => (
                    <Link
                      key={tag.id}
                      to={`/posts?tag=${tag.name}`}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white hover:scale-105 transition-transform"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                      <span className="ml-1 bg-white bg-opacity-30 rounded-full px-2 py-0.5 text-xs">
                        {tag.post_count}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm ? '没有找到匹配的标签' : '暂无标签'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm 
                ? `没有找到包含 "${searchTerm}" 的标签`
                : '还没有创建任何标签'
              }
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-3 text-blue-600 hover:text-blue-700"
              >
                清除搜索
              </button>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default TagsPage;
