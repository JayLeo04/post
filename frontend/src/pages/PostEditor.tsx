import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { postsAPI, tagsAPI, uploadAPI } from '../utils/api';
import { Post, Tag, CreatePostData } from '../types';
import { useAuth } from '../hooks/useAuth';
import Header from '../components/Header';
import Footer from '../components/Footer';

const PostEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isEditing = !!id;

  const [formData, setFormData] = useState<CreatePostData>({
    title: '',
    content: '',
    summary: '',
    cover_image: '',
    published: false,
    tag_names: [],
  });
  
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const [newTag, setNewTag] = useState('');
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    fetchTags();
    if (isEditing) {
      fetchPost();
    }
  }, [id]);

  const fetchTags = async () => {
    try {
      const response = await tagsAPI.getTags();
      setTags(response.data);
    } catch (error) {
      console.error('获取标签失败:', error);
    }
  };

  const fetchPost = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await postsAPI.getPost(parseInt(id));
      const post = response.data;
        setFormData({
        title: post.title,
        content: post.content,
        summary: post.summary,
        cover_image: post.cover_image,
        published: post.published,
        tag_names: post.tags.map((tag: Tag) => tag.name),
      });
    } catch (error) {
      console.error('获取文章失败:', error);
      alert('文章不存在或获取失败');
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
    setHasUnsavedChanges(true);
  };

  // 自动保存功能
  useEffect(() => {
    if (!hasUnsavedChanges || !isEditing) return;

    const autoSaveTimer = setTimeout(async () => {
      await handleAutoSave();
    }, 30000); // 30秒后自动保存

    return () => clearTimeout(autoSaveTimer);
  }, [formData, hasUnsavedChanges, isEditing]);

  const handleAutoSave = async () => {
    if (!id || !hasUnsavedChanges) return;

    try {
      setAutoSaving(true);
      await postsAPI.updatePost(parseInt(id), formData);
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
    } catch (error) {
      console.error('自动保存失败:', error);
    } finally {
      setAutoSaving(false);
    }
  };

  const handleTagToggle = (tagName: string) => {
    setFormData(prev => ({
      ...prev,
      tag_names: prev.tag_names.includes(tagName)
        ? prev.tag_names.filter(name => name !== tagName)
        : [...prev.tag_names, tagName],
    }));
  };

  const handleAddNewTag = () => {
    if (newTag.trim() && !formData.tag_names.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tag_names: [...prev.tag_names, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const response = await uploadAPI.uploadFile(file);
      setFormData(prev => ({
        ...prev,
        cover_image: response.data.url,
      }));
    } catch (error) {
      console.error('上传文件失败:', error);
      alert('上传文件失败');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (isEditing) {
        await postsAPI.updatePost(parseInt(id!), formData);
      } else {
        await postsAPI.createPost(formData);
      }
      
      navigate('/admin');
    } catch (error) {
      console.error('保存文章失败:', error);
      alert('保存文章失败');
    } finally {
      setSaving(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        
        // 获取粘贴的图片文件
        const file = items[i].getAsFile();
        if (!file) continue;
        
        try {
          // 显示上传中提示
          const textArea = e.currentTarget;
          const cursorPos = textArea.selectionStart;
          const textBefore = formData.content.substring(0, cursorPos);
          const textAfter = formData.content.substring(cursorPos);
          const uploadingText = '![上传中...]()';
          
          // 临时显示上传中文本
          setFormData(prev => ({
            ...prev,
            content: textBefore + uploadingText + textAfter
          }));
          
          // 上传图片
          const response = await uploadAPI.uploadFile(file);
          const imageUrl = `http://localhost:8080${response.data.url}`;
          const markdownImage = `![图片](${imageUrl})`;
          
          // 替换为实际的图片链接
          setFormData(prev => ({
            ...prev,
            content: prev.content.replace(uploadingText, markdownImage)
          }));
          
          setHasUnsavedChanges(true);
        } catch (error) {
          console.error('上传图片失败:', error);
          alert('上传图片失败');
          
          // 移除上传中的提示
          setFormData(prev => ({
            ...prev,
            content: prev.content.replace('![上传中...]()', '')
          }));
        }
        
        return;
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header isAdmin={true} onLogout={logout} />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded mb-4"></div>
            <div className="h-64 bg-gray-300 rounded"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header isAdmin={true} onLogout={logout} />
      
      <main className="max-w-4xl mx-auto px-4 py-8">        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isEditing ? '编辑文章' : '新建文章'}
              </h1>
              <p className="text-gray-600 mt-2">
                使用Markdown语法编写文章内容
              </p>
            </div>
            
            {/* 状态指示器 */}
            <div className="flex items-center space-x-4">
              {autoSaving && (
                <div className="flex items-center text-blue-600">
                  <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  自动保存中...
                </div>
              )}
              
              {lastSaved && !autoSaving && (
                <div className="text-green-600 text-sm">
                  最后保存：{lastSaved.toLocaleTimeString()}
                </div>
              )}
              
              {hasUnsavedChanges && !autoSaving && (
                <div className="text-yellow-600 text-sm">
                  有未保存的更改
                </div>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            {/* 标题 */}
            <div className="mb-6">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                文章标题
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入文章标题"
              />
            </div>

            {/* 摘要 */}
            <div className="mb-6">
              <label htmlFor="summary" className="block text-sm font-medium text-gray-700 mb-2">
                文章摘要
              </label>
              <textarea
                id="summary"
                name="summary"
                rows={3}
                value={formData.summary}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入文章摘要（可选）"
              />
            </div>

            {/* 封面图片 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                封面图片
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {formData.cover_image && (
                  <img
                    src={`http://localhost:8080${formData.cover_image}`}
                    alt="封面预览"
                    className="h-20 w-20 object-cover rounded"
                  />
                )}
              </div>
            </div>

            {/* 标签选择 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                文章标签
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleTagToggle(tag.name)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      formData.tag_names.includes(tag.name)
                        ? 'text-white ring-2 ring-offset-2 ring-blue-500'
                        : 'text-white hover:opacity-80'
                    }`}
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
              
              {/* 添加新标签 */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="添加新标签"
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNewTag())}
                />
                <button
                  type="button"
                  onClick={handleAddNewTag}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  添加
                </button>
              </div>
            </div>            {/* 内容编辑 */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                  文章内容 (Markdown)
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setViewMode('edit')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      viewMode === 'edit'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('split')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      viewMode === 'split'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    分屏
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('preview')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      viewMode === 'preview'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    预览
                  </button>
                </div>
              </div>
              
              {viewMode === 'edit' && (
                <textarea
                  id="content"
                  name="content"
                  required
                  rows={20}
                  value={formData.content}
                  onChange={handleInputChange}
                  onPaste={handlePaste}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="请使用Markdown语法编写文章内容..."
                />
              )}
                {viewMode === 'preview' && (
                <div className="w-full min-h-96 p-4 border border-gray-300 rounded-md bg-white prose prose-lg max-w-none">
                  <ReactMarkdown
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <SyntaxHighlighter
                            style={tomorrow as any}
                            language={match[1]}
                            PreTag="div"
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {formData.content || '*没有内容*'}
                  </ReactMarkdown>
                </div>
              )}
              
              {viewMode === 'split' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">编辑</h3>
                    <textarea
                      id="content"
                      name="content"
                      required
                      rows={20}
                      value={formData.content}
                      onChange={handleInputChange}
                      onPaste={handlePaste}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                      placeholder="请使用Markdown语法编写文章内容...(支持直接粘贴图片)"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">预览</h3>                    <div className="w-full h-96 p-4 border border-gray-300 rounded-md bg-white prose prose-sm max-w-none overflow-y-auto">
                      <ReactMarkdown
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={tomorrow as any}
                                language={match[1]}
                                PreTag="div"
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {formData.content || '*没有内容*'}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 发布选项 */}
            <div className="mb-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="published"
                  checked={formData.published}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">立即发布</span>
              </label>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                取消
              </button>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={saving}
                  onClick={() => setFormData(prev => ({ ...prev, published: false }))}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存草稿'}
                </button>
                
                <button
                  type="submit"
                  disabled={saving}
                  onClick={() => setFormData(prev => ({ ...prev, published: true }))}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? '发布中...' : isEditing ? '更新文章' : '发布文章'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
};

export default PostEditor;
