import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { postsAPI } from '../utils/api';
import { Post } from '../types';
import { useAuth } from '../hooks/useAuth';
import Header from '../components/Header';
import Footer from '../components/Footer';

const PostDetail: React.FC = () => {  const { id } = useParams<{ id: string }>();  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const { isAuthenticated } = useAuth();
  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      try {
        const [postResponse, likeResponse] = await Promise.all([
          postsAPI.getPost(parseInt(id)),
          postsAPI.checkLike(parseInt(id))
        ]);
        
        setPost(postResponse.data);
        setLikes(postResponse.data.likes || 0);
        setIsLiked(likeResponse.data.liked);
      } catch (error) {
        setError('文章不存在或加载失败');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);
  const handleLike = async () => {
    if (isLiking || !id) return;
    
    if (!isAuthenticated) {
      alert('请先登录后再点赞');
      return;
    }
    
    try {
      setIsLiking(true);
      const response = await postsAPI.likePost(parseInt(id));
      setLikes(response.data.likes);
      setIsLiked(response.data.liked);
    } catch (error) {
      console.error('点赞操作失败:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded mb-4"></div>
            <div className="h-4 bg-gray-300 rounded mb-2"></div>
            <div className="h-4 bg-gray-300 rounded mb-2"></div>
            <div className="h-4 bg-gray-300 rounded"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">文章不存在</h1>
          <Link to="/posts" className="text-blue-600 hover:text-blue-700">
            返回文章列表
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <article className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {post.cover_image && (
            <div className="aspect-w-16 aspect-h-9">
              <img
                src={`http://localhost:8080${post.cover_image}`}
                alt={post.title}
                className="w-full h-64 object-cover"
              />
            </div>
          )}
          
          <div className="p-8">            <div className="flex items-center gap-2 mb-4">
              {post.tags && post.tags.map((tag) => (
                <Link
                  key={tag.id}
                  to={`/posts?tag=${tag.name}`}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </Link>
              ))}
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">{post.title}</h1>            <div className="flex items-center gap-6 text-sm text-gray-500 mb-8 pb-8 border-b">
              <span>{formatDate(post.created_at)}</span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {post.view_count} 次阅读
              </span>              <button 
                onClick={handleLike}
                className={`flex items-center gap-1 transition-colors ${
                  isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                }`}
                disabled={isLiking}
                title={isLiked ? "取消点赞" : "点赞"}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
                {likes} 人点赞 {isLiked && '(已点赞)'}
              </button>
            </div>

            <div className="prose prose-lg max-w-none">
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }) {                    const match = /language-(\w+)/.exec(className || '');
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
                {post.content}
              </ReactMarkdown>
            </div>
          </div>
        </article>

        <div className="mt-8 text-center">
          <Link
            to="/posts"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ← 返回文章列表
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PostDetail;
