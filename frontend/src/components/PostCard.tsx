import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Post } from '../types';
import { postsAPI } from '../utils/api';
import { useAuth } from '../hooks/useAuth';

interface PostCardProps {
  post: Post;
  showFullContent?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({ post, showFullContent = false }) => {
  const [likes, setLikes] = useState(post.likes || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const { isAuthenticated } = useAuth();
  
  useEffect(() => {
    const checkLikeStatus = async () => {
      try {
        const response = await postsAPI.checkLike(post.id);
        setIsLiked(response.data.liked);
      } catch (error) {
        console.error('获取点赞状态失败:', error);
      }
    };
    
    if (isAuthenticated) {
      checkLikeStatus();
    }
  }, [post.id, isAuthenticated]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
    const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLiking) return;
    
    if (!isAuthenticated) {
      alert('请先登录后再点赞');
      return;
    }
    
    try {
      setIsLiking(true);
      const response = await postsAPI.likePost(post.id);
      setLikes(response.data.likes);
      setIsLiked(response.data.liked);
    } catch (error) {
      console.error('点赞操作失败:', error);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <article className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {post.cover_image && (
        <div className="aspect-w-16 aspect-h-9">
          <img
            src={`http://localhost:8080${post.cover_image}`}
            alt={post.title}
            className="w-full h-48 object-cover"
          />
        </div>
      )}
      
      <div className="p-6">        <div className="flex items-center gap-2 mb-3">
          {post.tags && post.tags.map((tag) => (
            <Link
              key={tag.id}
              to={`/posts?tag=${tag.name}`}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </Link>
          ))}
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-3">
          {showFullContent ? (
            post.title
          ) : (
            <Link to={`/posts/${post.id}`} className="hover:text-blue-600 transition-colors">
              {post.title}
            </Link>
          )}
        </h2>

        <p className="text-gray-600 mb-4 line-clamp-3">
          {post.summary || post.content.substring(0, 150) + '...'}
        </p>        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <span>{formatDate(post.created_at)}</span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {post.view_count}
            </span>            <button 
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
              {likes}
            </button>
          </div>
          
          {!showFullContent && (
            <Link
              to={`/posts/${post.id}`}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              阅读更多 →
            </Link>
          )}
        </div>
      </div>
    </article>
  );
};

export default PostCard;
