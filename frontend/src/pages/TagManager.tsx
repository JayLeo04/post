import React, { useState, useEffect } from 'react';
import { tagsAPI } from '../utils/api';
import { Tag } from '../types';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../hooks/useAuth';

const TagManager: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState({ name: '', color: '#3B82F6' });
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const response = await tagsAPI.getTags();
      setTags(response.data || []);
    } catch (error) {
      console.error('获取标签失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.name.trim()) return;

    try {
      await tagsAPI.createTag(newTag);
      setNewTag({ name: '', color: '#3B82F6' });
      setShowForm(false);
      fetchTags();
    } catch (error) {
      console.error('创建标签失败:', error);
      alert('创建标签失败');
    }
  };

  const handleUpdateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTag) return;

    try {
      await tagsAPI.updateTag(editingTag.id, {
        name: editingTag.name,
        color: editingTag.color,
      });
      setEditingTag(null);
      fetchTags();
    } catch (error) {
      console.error('更新标签失败:', error);
      alert('更新标签失败');
    }
  };

  const handleDeleteTag = async (id: number) => {
    if (window.confirm('确定要删除这个标签吗？删除后相关文章的标签也会被移除。')) {
      try {
        await tagsAPI.deleteTag(id);
        fetchTags();
      } catch (error) {
        console.error('删除标签失败:', error);
        alert('删除标签失败');
      }
    }
  };

  const predefinedColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header isAdmin={true} onLogout={logout} />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">标签管理</h1>
          <p className="text-gray-600">管理博客标签，创建、编辑和删除标签</p>
        </div>

        {/* 创建标签按钮 */}
        <div className="mb-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            创建新标签
          </button>
        </div>

        {/* 创建标签表单 */}
        {showForm && (
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">创建新标签</h2>
            </div>
            <form onSubmit={handleCreateTag} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    标签名称
                  </label>
                  <input
                    type="text"
                    value={newTag.name}
                    onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="输入标签名称"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    标签颜色
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newTag.color}
                      onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
                      className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <div className="flex flex-wrap gap-1">
                      {predefinedColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewTag({ ...newTag, color })}
                          className="w-6 h-6 rounded border-2 border-white shadow-sm hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  创建标签
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <div className="ml-auto">
                  <span
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: newTag.color }}
                  >
                    {newTag.name || '预览'}
                  </span>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* 标签列表 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">所有标签</h2>
          </div>
          
          {loading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-6 w-16 bg-gray-300 rounded-full mr-3"></div>
                      <div className="h-4 bg-gray-300 rounded w-20"></div>
                    </div>
                    <div className="flex space-x-2">
                      <div className="h-8 w-16 bg-gray-300 rounded"></div>
                      <div className="h-8 w-16 bg-gray-300 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {tags.length > 0 ? (
                tags.map((tag) => (
                  <div key={tag.id} className="px-6 py-4">
                    {editingTag && editingTag.id === tag.id ? (
                      <form onSubmit={handleUpdateTag} className="flex items-center gap-4">
                        <input
                          type="text"
                          value={editingTag.name}
                          onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={editingTag.color}
                            onChange={(e) => setEditingTag({ ...editingTag, color: e.target.value })}
                            className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                          />
                          <div className="flex gap-1">
                            {predefinedColors.slice(0, 5).map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => setEditingTag({ ...editingTag, color })}
                                className="w-5 h-5 rounded border border-white shadow-sm hover:scale-110 transition-transform"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="submit"
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            保存
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTag(null)}
                            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                          >
                            取消
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white mr-3"
                            style={{ backgroundColor: tag.color }}
                          >
                            {tag.name}
                          </span>
                          <span className="text-sm text-gray-500">
                            颜色: {tag.color}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setEditingTag(tag)}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-4 font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDeleteTag(tag.id)}
                            className="inline-flex items-center px-3 py-1 border border-red-300 text-sm leading-4 font-medium rounded text-red-700 bg-white hover:bg-red-50"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center">
                  <p className="text-gray-500">暂无标签</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="mt-2 inline-flex items-center text-blue-600 hover:text-blue-700"
                  >
                    创建第一个标签
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TagManager;
