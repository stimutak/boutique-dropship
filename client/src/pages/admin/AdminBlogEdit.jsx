import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AdminLayout from '../../components/Layout/AdminLayout';
import { updateBlogPost, fetchAdminBlogPosts, uploadBlogImages, clearUploadedBlogImages } from '../../store/slices/adminBlogSlice';

const AdminBlogEdit = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { posts, uploadedImages, isLoading } = useSelector(state => state.adminBlog);
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!posts || posts.length === 0) {
      dispatch(fetchAdminBlogPosts({ page: 1 }));
    }
  }, [dispatch, posts?.length]);

  useEffect(() => {
    const found = posts.find(p => p._id === id);
    if (found) setForm({ ...found });
  }, [posts, id]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await dispatch(uploadBlogImages(files));
  };

  const useUploadedAsCover = () => {
    if (uploadedImages.length > 0) {
      const first = uploadedImages[0];
      setForm(f => ({ ...f, coverImage: { url: first.url, alt: f.title } }));
      dispatch(clearUploadedBlogImages());
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    await dispatch(updateBlogPost({ id, updates: form })).unwrap();
    navigate('/admin/blog');
  };

  if (!form) {
    return (
      <AdminLayout>
        <div className="loading">{t('common.loading')}</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-blog-edit">
        <h2>{t('admin.blog.edit')}</h2>
        <form onSubmit={onSubmit} className="admin-form" style={{ background: 'white', padding: 16, borderRadius: 8, border: '1px solid var(--luxury-stone)' }}>
          <div className="form-group">
            <label>Title</label>
            <input name="title" value={form.title} onChange={onChange} />
          </div>
          <div className="form-group">
            <label>Slug</label>
            <input name="slug" value={form.slug} onChange={onChange} />
          </div>
          <div className="form-group">
            <label>Excerpt</label>
            <textarea name="excerpt" value={form.excerpt} onChange={onChange} rows={3} />
          </div>
          <div className="form-group">
            <label>Content (HTML allowed)</label>
            <textarea name="content" value={form.content} onChange={onChange} rows={10} />
          </div>
          <div className="form-group">
            <label>Cover Image URL</label>
            <input value={form.coverImage?.url || ''} onChange={(e) => setForm(f => ({ ...f, coverImage: { ...(f.coverImage || {}), url: e.target.value } }))} />
          </div>
          <div className="form-group">
            <label>Upload New Cover Image</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} />
            {uploadedImages.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={useUploadedAsCover}>Use first uploaded as cover</button>
              </div>
            )}
          </div>
          <div className="form-group">
            <label>
              <input type="checkbox" name="published" checked={!!form.published} onChange={onChange} /> {form.published ? t('admin.blog.unpublish') : t('admin.blog.publish')}
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={isLoading}>{isLoading ? t('common.saving') : t('common.save')}</button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AdminBlogEdit;

