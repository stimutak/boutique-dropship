import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchBlogPosts } from '../store/slices/blogSlice';

const Blog = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const page = parseInt(params.get('page') || '1', 10);
  const { posts, isLoading, error, pagination } = useSelector(state => state.blog);

  useEffect(() => {
    dispatch(fetchBlogPosts({ page, limit: 2 }));
  }, [dispatch, page]);

  const goToPage = (p) => {
    setParams({ page: String(p) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="blog-page">
      {/* Full-screen background image */}
      <div className="blog-background"></div>
      
      <div className="blog-container">
        <div className="blog-title-wrapper">
          <h1 className="blog-main-title">From The Blog</h1>
        </div>
        
        {isLoading && (
          <div className="blog-loading">
            <div className="loading-spinner">{t('common.loading')}</div>
          </div>
        )}
        
        {error && (
          <div className="blog-error">
            <div className="error-message">{error}</div>
          </div>
        )}

        {!isLoading && !error && (
          <>
            <div className="blog-posts-grid">
              {posts[0] && (
                <article className="blog-card">
                  {posts[0].coverImage?.url && (
                    <div className="blog-card-image">
                      <img 
                        src={posts[0].coverImage.url} 
                        alt={posts[0].coverImage.alt || posts[0].title} 
                      />
                    </div>
                  )}
                  <div className="blog-card-content">
                    <div className="blog-card-category">
                      {posts[0].tags?.[0] || 'Lifestyle'}
                    </div>
                    
                    <h2 className="blog-card-title">
                      <Link to={`/blog/${posts[0].slug}`}>
                        {posts[0].title}
                      </Link>
                    </h2>
                    
                    <p className="blog-card-body">
                      {posts[0].excerpt || posts[0].content?.substring(0, 200) + '...'}
                    </p>
                    
                    <div className="blog-card-footer">
                      <span className="blog-card-date">
                        {new Date(posts[0].publishedAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </span>
                      <Link 
                        className="blog-read-more" 
                        to={`/blog/${posts[0].slug}`}
                      >
                        {t('blog.readMore', 'Read more')} →
                      </Link>
                    </div>
                  </div>
                </article>
              )}

              {posts[1] && (
                <article className="blog-card">
                  {posts[1].coverImage?.url && (
                    <div className="blog-card-image">
                      <img 
                        src={posts[1].coverImage.url} 
                        alt={posts[1].coverImage.alt || posts[1].title} 
                      />
                    </div>
                  )}
                  <div className="blog-card-content">
                    <div className="blog-card-category">
                      {posts[1].tags?.[0] || 'Wellness'}
                    </div>
                    
                    <h2 className="blog-card-title">
                      <Link to={`/blog/${posts[1].slug}`}>
                        {posts[1].title}
                      </Link>
                    </h2>
                    
                    <p className="blog-card-body">
                      {posts[1].excerpt || posts[1].content?.substring(0, 200) + '...'}
                    </p>
                    
                    <div className="blog-card-footer">
                      <span className="blog-card-date">
                        {new Date(posts[1].publishedAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </span>
                      <Link 
                        className="blog-read-more" 
                        to={`/blog/${posts[1].slug}`}
                      >
                        {t('blog.readMore', 'Read more')} →
                      </Link>
                    </div>
                  </div>
                </article>
              )}
            </div>

            <div className="blog-navigation">
              <button 
                className="blog-nav-btn prev" 
                disabled={!pagination.hasPrevPage} 
                onClick={() => goToPage(pagination.currentPage - 1)}
              >
                ← {t('common.previous', 'Previous')}
              </button>
              
              <span className="blog-page-info">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              
              <button 
                className="blog-nav-btn next" 
                disabled={!pagination.hasNextPage} 
                onClick={() => goToPage(pagination.currentPage + 1)}
              >
                {t('common.next', 'Next')} →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Blog;

