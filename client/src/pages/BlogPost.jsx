import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchBlogPostBySlug, clearCurrentPost } from '../store/slices/blogSlice';

const BlogPost = () => {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { currentPost, isLoading, error } = useSelector(state => state.blog);

  useEffect(() => {
    dispatch(fetchBlogPostBySlug(slug));
    return () => { dispatch(clearCurrentPost()); };
  }, [dispatch, slug]);

  if (isLoading) return <div className="loading">{t('common.loading')}</div>;
  if (error) return <div className="error">{error}</div>;
  if (!currentPost) return null;

  return (
    <div className="blog-post-page">
      <div className="blog-hero" />
      <article className="blog-post">
        <header className="blog-post-header">
          <h1>{currentPost.title}</h1>
          <div className="post-meta">
            <span>{new Date(currentPost.publishedAt).toLocaleDateString()}</span>
            {currentPost.readingTime ? <span> · {currentPost.readingTime} min</span> : null}
          </div>
          {currentPost.coverImage?.url && (
            <img className="post-cover hero" src={currentPost.coverImage.url} alt={currentPost.coverImage.alt || currentPost.title} />
          )}
        </header>
        <div className="blog-post-content" dangerouslySetInnerHTML={{ __html: currentPost.content }} />
      </article>
    </div>
  );
};

export default BlogPost;

