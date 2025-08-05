import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { 
  fetchAllReviews, 
  approveReview, 
  rejectReview, 
  deleteReview,
  fetchReviewStats 
} from '../../store/slices/reviewsSlice';
import StarRating from '../reviews/StarRating';
import './AdminReviews.css';

const AdminReviews = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  
  const { 
    allReviews, 
    allReviewsLoading, 
    allReviewsError,
    allReviewsPagination,
    stats,
    statsLoading
  } = useSelector(state => state.reviews);
  
  const [filters, setFilters] = useState({
    status: '',
    page: 1
  });
  
  const [selectedReview, setSelectedReview] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState('');

  useEffect(() => {
    dispatch(fetchAllReviews(filters));
    dispatch(fetchReviewStats());
  }, [dispatch, filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const openModal = (review, action) => {
    setSelectedReview(review);
    setModalAction(action);
    setAdminNotes('');
    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedReview(null);
    setModalAction('');
    setAdminNotes('');
    setShowModal(false);
  };

  const handleApprove = async () => {
    if (selectedReview) {
      await dispatch(approveReview({ 
        reviewId: selectedReview._id, 
        adminNotes 
      }));
      closeModal();
      dispatch(fetchReviewStats());
    }
  };

  const handleReject = async () => {
    if (selectedReview && adminNotes.trim()) {
      await dispatch(rejectReview({ 
        reviewId: selectedReview._id, 
        adminNotes 
      }));
      closeModal();
      dispatch(fetchReviewStats());
    }
  };

  const handleDelete = async () => {
    if (selectedReview) {
      await dispatch(deleteReview(selectedReview._id));
      closeModal();
      dispatch(fetchReviewStats());
    }
  };

  return (
    <div className="admin-reviews">
      <div className="admin-reviews__header">
        <h2>{t('admin.reviews.title')}</h2>
        
        {/* Stats */}
        {stats && !statsLoading && (
          <div className="admin-reviews__stats">
            <div className="stat-card">
              <div className="stat-card__value">{stats.totalReviews}</div>
              <div className="stat-card__label">{t('admin.reviews.totalReviews')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__value">{stats.pendingReviews}</div>
              <div className="stat-card__label">{t('admin.reviews.pendingReviews')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__value">{stats.approvedReviews}</div>
              <div className="stat-card__label">{t('admin.reviews.approvedReviews')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__value">{stats.averageRating?.toFixed(1) || '0.0'}</div>
              <div className="stat-card__label">{t('admin.reviews.averageRating')}</div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="admin-reviews__filters">
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="filter-select"
        >
          <option value="">{t('admin.reviews.allStatuses')}</option>
          <option value="pending">{t('admin.reviews.pending')}</option>
          <option value="approved">{t('admin.reviews.approved')}</option>
          <option value="rejected">{t('admin.reviews.rejected')}</option>
        </select>
      </div>

      {/* Reviews Table */}
      {allReviewsLoading ? (
        <div className="loading">{t('common.loading')}</div>
      ) : allReviewsError ? (
        <div className="error">{allReviewsError}</div>
      ) : (
        <>
          <div className="admin-reviews__table">
            <table>
              <thead>
                <tr>
                  <th>{t('admin.reviews.date')}</th>
                  <th>{t('admin.reviews.product')}</th>
                  <th>{t('admin.reviews.customer')}</th>
                  <th>{t('admin.reviews.rating')}</th>
                  <th>{t('admin.reviews.comment')}</th>
                  <th>{t('admin.reviews.status')}</th>
                  <th>{t('admin.reviews.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {allReviews.map(review => (
                  <tr key={review._id}>
                    <td>{new Date(review.createdAt).toLocaleDateString()}</td>
                    <td>
                      <a href={`/products/${review.product?.slug}`} target="_blank" rel="noopener noreferrer">
                        {review.product?.name || t('admin.reviews.deletedProduct')}
                      </a>
                    </td>
                    <td>{review.user?.name || t('admin.reviews.deletedUser')}</td>
                    <td>
                      <StarRating rating={review.rating} readonly size="small" />
                    </td>
                    <td className="comment-cell">
                      <div className="comment-preview">{review.comment}</div>
                    </td>
                    <td>
                      <span className={`status status--${review.status}`}>
                        {t(`admin.reviews.${review.status}`)}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {review.status === 'pending' && (
                          <>
                            <button
                              onClick={() => openModal(review, 'approve')}
                              className="btn btn--approve"
                            >
                              {t('admin.reviews.approve')}
                            </button>
                            <button
                              onClick={() => openModal(review, 'reject')}
                              className="btn btn--reject"
                            >
                              {t('admin.reviews.reject')}
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => openModal(review, 'delete')}
                          className="btn btn--delete"
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {allReviewsPagination && allReviewsPagination.totalPages > 1 && (
            <div className="admin-reviews__pagination">
              <button
                disabled={allReviewsPagination.currentPage === 1}
                onClick={() => handlePageChange(allReviewsPagination.currentPage - 1)}
              >
                {t('common.previous')}
              </button>
              <span>
                {t('common.pageOf', { 
                  current: allReviewsPagination.currentPage, 
                  total: allReviewsPagination.totalPages 
                })}
              </span>
              <button
                disabled={allReviewsPagination.currentPage === allReviewsPagination.totalPages}
                onClick={() => handlePageChange(allReviewsPagination.currentPage + 1)}
              >
                {t('common.next')}
              </button>
            </div>
          )}
        </>
      )}

      {/* Action Modal */}
      {showModal && selectedReview && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>
              {modalAction === 'approve' && t('admin.reviews.approveReview')}
              {modalAction === 'reject' && t('admin.reviews.rejectReview')}
              {modalAction === 'delete' && t('admin.reviews.deleteReview')}
            </h3>
            
            <div className="modal-review-details">
              <p><strong>{t('admin.reviews.product')}:</strong> {selectedReview.product?.name}</p>
              <p><strong>{t('admin.reviews.customer')}:</strong> {selectedReview.user?.name}</p>
              <p><strong>{t('admin.reviews.rating')}:</strong> <StarRating rating={selectedReview.rating} readonly /></p>
              <p><strong>{t('admin.reviews.comment')}:</strong></p>
              <div className="review-comment">{selectedReview.comment}</div>
            </div>

            {(modalAction === 'approve' || modalAction === 'reject') && (
              <div className="modal-notes">
                <label>{t('admin.reviews.adminNotes')}:</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={modalAction === 'reject' ? t('admin.reviews.rejectReasonRequired') : t('admin.reviews.optionalNotes')}
                  rows={3}
                  required={modalAction === 'reject'}
                />
              </div>
            )}

            <div className="modal-actions">
              <button onClick={closeModal} className="btn btn--cancel">
                {t('common.cancel')}
              </button>
              {modalAction === 'approve' && (
                <button onClick={handleApprove} className="btn btn--approve">
                  {t('admin.reviews.confirmApprove')}
                </button>
              )}
              {modalAction === 'reject' && (
                <button 
                  onClick={handleReject} 
                  className="btn btn--reject"
                  disabled={!adminNotes.trim()}
                >
                  {t('admin.reviews.confirmReject')}
                </button>
              )}
              {modalAction === 'delete' && (
                <button onClick={handleDelete} className="btn btn--delete">
                  {t('admin.reviews.confirmDelete')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReviews;