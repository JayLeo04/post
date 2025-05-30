import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { postsAPI, tagsAPI } from '../utils/api';
import { Post, Tag } from '../types';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PostCard from '../components/PostCard';

const PostList: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);  const [searchParams, setSearchParams] = useSearchParams();
  
  const searchQuery = searchParams.get('search') || '';
  const selectedTag = searchParams.get('tag') || '';
  const sortBy = searchParams.get('sort_by') || 'created_at';
  const limit = 10;
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);      const response = await postsAPI.getPosts({
        page,
        limit,
        search: searchQuery,
        tag: selectedTag,
        published: 'true',
        sort_by: sortBy,
      });
      // 确保始终传递数组，即使服务器返回null
      setPosts(Array.isArray(response.data.posts) ? response.data.posts : []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('获取文章失败:', error);
      setPosts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, selectedTag, sortBy]);
  const fetchTags = async () => {
    try {
      const response = await tagsAPI.getTags();
      setTags(response.data || []);
    } catch (error) {
      console.error('获取标签失败:', error);
      setTags([]);
    }
  };
  useEffect(() => {
    fetchPosts();
    fetchTags();
  }, [fetchPosts]);
  // 当搜索参数改变时重置页面
  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedTag, sortBy]);const handleSearch = (search: string) => {
    setSearchParams((prev: URLSearchParams) => {
      const newParams = new URLSearchParams(prev);
      if (search) {
        newParams.set('search', search);
      } else {
        newParams.delete('search');
      }
      return newParams;
    });
    setPage(1);
  };const handleTagFilter = (tag: string) => {
    setSearchParams((prev: URLSearchParams) => {
      const newParams = new URLSearchParams(prev);
      if (tag) {
        newParams.set('tag', tag);
      } else {
        newParams.delete('tag');
      }
      newParams.delete('search');
      return newParams;
    });
    setPage(1);
  };const handleSort = (sort: string) => {
    setSearchParams((prev: URLSearchParams) => {
      const newParams = new URLSearchParams(prev);
      if (sort) {
        newParams.set('sort_by', sort);
      } else {
        newParams.delete('sort_by');
      }
      return newParams;
    });
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-8">        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">所有文章</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">排序方式:</span>
              <select
                value={sortBy}
                onChange={(e) => handleSort(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="created_at">最新发布</option>
                <option value="view_count">最多阅读</option>
                <option value="likes">最多点赞</option>
              </select>
            </div>
          </div>
          
          {/* 搜索和过滤 */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="搜索文章..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                defaultValue={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleTagFilter('')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  !selectedTag
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                全部
              </button>
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleTagFilter(tag.name)}
                  className={`px-3 py-1 rounded-full text-sm font-medium text-white transition-colors ${
                    selectedTag === tag.name ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                  }`}
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
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
        ) : posts && posts.length > 0 ? (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                
                <span className="px-3 py-2 text-sm text-gray-700">
                  第 {page} 页，共 {totalPages} 页
                </span>
                
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              {searchQuery || selectedTag ? '没有找到相关文章' : '暂无文章'}
            </p>
            {(searchQuery || selectedTag) && (
              <button
                onClick={() => {
                  setSearchParams({});
                  setPage(1);
                }}
                className="mt-4 text-blue-600 hover:text-blue-700"
              >
                查看所有文章
              </button>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default PostList;
