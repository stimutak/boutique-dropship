import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import AdminLayout from '../../components/Layout/AdminLayout';
import { fetchAdminBlogPosts, deleteBlogPost } from '../../store/slices/adminBlogSlice';
import { Link, useNavigate } from 'react-router-dom';

const AdminBlog = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { posts, isLoading, error, pagination } = useSelector(state => state.adminBlog);
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchAdminBlogPosts({ page, limit: 10 }));
  }, [dispatch, page]);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`${t('admin.blog.confirmDelete')}\n\n"${title}"`)) return;
    await dispatch(deleteBlogPost(id));
    dispatch(fetchAdminBlogPosts({ page, limit: 10 }));
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  return (
    <AdminLayout>
      <div className="admin-content">
        <div className="admin-header">
          <h1>{t('admin.blog.title')}</h1>
          <button 
            className="btn btn-primary" 
            onClick={() => navigate('/admin/blog/new')}
          >
            <i className="fas fa-plus"></i> {t('admin.blog.add')}
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}

        <div className="admin-card">
          {isLoading ? (
            <div className="loading-spinner">
              <i className="fas fa-spinner fa-spin"></i> {t('common.loading')}
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-newspaper" style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }}></i>
              <p>No blog posts yet</p>
              <button 
                className="btn btn-primary" 
                onClick={() => navigate('/admin/blog/new')}
              >
                Create your first post
              </button>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Slug</th>
                      <th>Author</th>
                      <th>Status</th>
                      <th>Published</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map(post => (
                      <tr key={post._id}>
                        <td>
                          <div className="text-primary font-medium">{post.title}</div>
                          {post.excerpt && (
                            <div className="text-muted text-sm" style={{ marginTop: '4px' }}>
                              {post.excerpt.substring(0, 60)}...
                            </div>
                          )}
                        </td>
                        <td>
                          <code className="text-sm">{post.slug}</code>
                        </td>
                        <td>{post.author || 'Staff'}</td>
                        <td>
                          <span className={`badge ${post.published ? 'badge-success' : 'badge-warning'}`}>
                            {post.published ? t('admin.blog.published') : t('admin.blog.draft')}
                          </span>
                        </td>
                        <td>
                          {post.publishedAt ? (
                            new Date(post.publishedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          <div className="btn-group">
                            <Link 
                              to={`/blog/${post.slug}`} 
                              target="_blank"
                              className="btn btn-sm btn-outline"
                              title="View"
                            >
                              <i className="fas fa-eye"></i>
                            </Link>
                            <Link 
                              to={`/admin/blog/${post._id}/edit`} 
                              className="btn btn-sm btn-secondary"
                              title="Edit"
                            >
                              <i className="fas fa-edit"></i>
                            </Link>
                            <button 
                              className="btn btn-sm btn-danger" 
                              onClick={() => handleDelete(post._id, post.title)}
                              title="Delete"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination && pagination.total > 10 && (
                <div className="pagination">
                  <button 
                    className="btn btn-sm"
                    disabled={page === 1}
                    onClick={() => handlePageChange(page - 1)}
                  >
                    Previous
                  </button>
                  <span className="pagination-info">
                    Page {page} of {Math.ceil(pagination.total / 10)}
                  </span>
                  <button 
                    className="btn btn-sm"
                    disabled={page >= Math.ceil(pagination.total / 10)}
                    onClick={() => handlePageChange(page + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminBlog;

