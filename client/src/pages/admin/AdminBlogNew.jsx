import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AdminLayout from '../../components/Layout/AdminLayout';
import { createBlogPost, uploadBlogImages, clearUploadedBlogImages } from '../../store/slices/adminBlogSlice';

const slugify = (text) => text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-');

const AdminBlogNew = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { uploadedImages, isLoading } = useSelector(state => state.adminBlog);

  const [form, setForm] = useState({ 
    title: '', 
    slug: '', 
    excerpt: '', 
    content: '', 
    author: 'Staff',
    tags: [],
    published: false, 
    coverImage: { url: '', alt: '' } 
  });
  const [tagInput, setTagInput] = useState('');

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const onTitleBlur = () => {
    if (!form.slug && form.title) {
      setForm(f => ({ ...f, slug: slugify(f.title) }));
    }
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!form.tags.includes(tagInput.trim())) {
        setForm(f => ({ ...f, tags: [...f.tags, tagInput.trim()] }));
      }
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));
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
    try {
      await dispatch(createBlogPost(form)).unwrap();
      navigate('/admin/blog');
    } catch (error) {
      console.error('Failed to create post:', error);
    }
  };

  return (
    <AdminLayout>
      <div className="admin-content">
        <div className="admin-header">
          <h1>{t('admin.blog.add')}</h1>
        </div>

        <form onSubmit={onSubmit} className="admin-form">
          <div className="admin-card">
            <div className="card-header">
              <h3>Post Details</h3>
            </div>
            
            <div className="form-row">
              <div className="form-group flex-1">
                <label htmlFor="title">
                  Title <span className="required">*</span>
                </label>
                <input 
                  id="title"
                  name="title" 
                  value={form.title} 
                  onChange={onChange} 
                  onBlur={onTitleBlur}
                  placeholder="Enter post title"
                  required 
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label htmlFor="slug">
                  Slug <span className="required">*</span>
                </label>
                <input 
                  id="slug"
                  name="slug" 
                  value={form.slug} 
                  onChange={onChange}
                  placeholder="post-url-slug"
                  pattern="[a-z0-9-]+"
                  title="Lowercase letters, numbers, and hyphens only"
                  required 
                />
                <small className="form-text">URL: /blog/{form.slug || 'post-url'}</small>
              </div>
              <div className="form-group" style={{ width: '200px' }}>
                <label htmlFor="author">Author</label>
                <input 
                  id="author"
                  name="author" 
                  value={form.author} 
                  onChange={onChange}
                  placeholder="Author name"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="excerpt">Excerpt</label>
              <textarea 
                id="excerpt"
                name="excerpt" 
                value={form.excerpt} 
                onChange={onChange} 
                rows={3}
                placeholder="Brief description of the post (shown in blog list)"
              />
            </div>

            <div className="form-group">
              <label htmlFor="content">
                Content <span className="required">*</span>
              </label>
              <textarea 
                id="content"
                name="content" 
                value={form.content} 
                onChange={onChange} 
                rows={15}
                placeholder="Write your blog post content here (HTML supported)"
                required 
              />
              <small className="form-text">You can use HTML tags for formatting</small>
            </div>

            <div className="form-group">
              <label htmlFor="tags">Tags</label>
              <input 
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Type a tag and press Enter"
              />
              {form.tags.length > 0 && (
                <div className="tag-list" style={{ marginTop: '8px' }}>
                  {form.tags.map(tag => (
                    <span key={tag} className="tag">
                      {tag}
                      <button 
                        type="button" 
                        onClick={() => removeTag(tag)}
                        className="tag-remove"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="admin-card">
            <div className="card-header">
              <h3>Cover Image</h3>
            </div>

            <div className="form-group">
              <label htmlFor="coverUrl">Image URL</label>
              <input 
                id="coverUrl"
                value={form.coverImage.url} 
                onChange={(e) => setForm(f => ({ 
                  ...f, 
                  coverImage: { ...f.coverImage, url: e.target.value } 
                }))}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="form-group">
              <label htmlFor="imageUpload">Or Upload Image</label>
              <input 
                id="imageUpload"
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload}
                className="file-input"
              />
              {uploadedImages.length > 0 && (
                <div className="uploaded-images" style={{ marginTop: '12px' }}>
                  {uploadedImages.map((img, idx) => (
                    <div key={idx} className="uploaded-image-preview">
                      <img 
                        src={img.url} 
                        alt="Uploaded" 
                        style={{ 
                          width: '100px', 
                          height: '100px', 
                          objectFit: 'cover',
                          borderRadius: '4px',
                          marginRight: '8px'
                        }}
                      />
                      <button 
                        type="button" 
                        className="btn btn-sm btn-secondary"
                        onClick={useUploadedAsCover}
                      >
                        Use as cover
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {form.coverImage.url && (
              <div className="form-group">
                <label>Preview</label>
                <img 
                  src={form.coverImage.url} 
                  alt="Cover preview" 
                  style={{ 
                    maxWidth: '300px', 
                    maxHeight: '200px',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}
                />
              </div>
            )}
          </div>

          <div className="admin-card">
            <div className="card-header">
              <h3>Publishing Options</h3>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  name="published" 
                  checked={form.published} 
                  onChange={onChange}
                />
                <span>Publish immediately</span>
              </label>
              <small className="form-text">
                {form.published 
                  ? 'Post will be visible on the blog immediately after saving'
                  : 'Post will be saved as a draft and not visible to visitors'}
              </small>
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => navigate('/admin/blog')}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isLoading}
            >
              {isLoading ? (
                <><i className="fas fa-spinner fa-spin"></i> Saving...</>
              ) : (
                <><i className="fas fa-save"></i> Create Post</>
              )}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AdminBlogNew;

