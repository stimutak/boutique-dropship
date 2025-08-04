import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { fetchMyReviews } from '../store/slices/reviewsSlice';
import StarRating from '../components/reviews/StarRating';
import './MyReviews.css';

const MyReviews = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { 
    myReviews, 
    myReviewsLoading, 
    myReviewsError, 
    myReviewsPagination 
  } = useSelector(state => state.reviews);
  
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (user) {
      dispatch(fetchMyReviews({ page: currentPage }));
    }
  }, [dispatch, user, currentPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved':
        return 'status-badge--approved';
      case 'pending':
        return 'status-badge--pending';
      case 'rejected':
        return 'status-badge--rejected';
      default:
        return '';
    }
  };

  if (!user) {
    return (
      <div className="my-reviews-page">
        <div className="container">
          <p>{t('auth.loginRequired')}</p>
          <Link to="/login" className="btn btn-primary">{t('auth.login')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="my-reviews-page">
      <div className="container">
        <h1>{t('reviews.myReviews')}</h1>
        
        {myReviewsLoading ? (
          <div className="loading">{t('common.loading')}</div>
        ) : myReviewsError ? (
          <div className="error-message">{t('common.errorLoading')}</div>
        ) : myReviews.length === 0 ? (
          <div className="no-reviews">
            <p>{t('reviews.noReviewsYet')}</p>
            <Link to="/products" className="btn btn-primary">
              {t('products.browseProducts')}
            </Link>
          </div>
        ) : (
          <>
            <div className="reviews-list">
              {myReviews.map(review => (
                <div key={review._id} className="review-card">
                  <div className="review-card__header">
                    <div className="review-card__product">
                      {review.product ? (
                        <Link to={`/products/${review.product.slug}`}>
                          <h3>{review.product.name}</h3>
                        </Link>
                      ) : (
                        <h3>{t('reviews.deletedProduct')}</h3>
                      )}
                      <span className={`status-badge ${getStatusBadgeClass(review.status)}`}>
                        {t(`reviews.status.${review.status}`)}
                      </span>
                    </div>
                    <div className="review-card__date">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="review-card__rating">
                    <StarRating rating={review.rating} readonly size="medium" />
                  </div>
                  
                  <div className="review-card__comment">
                    <p>{review.comment}</p>
                  </div>
                  
                  {review.adminNotes && review.status === 'rejected' && (
                    <div className="review-card__admin-notes">
                      <strong>{t('reviews.rejectionReason')}:</strong>
                      <p>{review.adminNotes}</p>
                    </div>
                  )}
                  
                  {review.status === 'approved' && (
                    <div className="review-card__stats">
                      <span className="helpful-count">
                        {review.helpfulCount || 0} {t('reviews.foundHelpful')}
                      </span>
                    </div>
                  )}
                  
                  {review.product && (
                    <div className="review-card__actions">
                      <Link 
                        to={`/products/${review.product.slug}`} 
                        className="btn btn-secondary btn-sm"
                      >
                        {t('products.viewProduct')}
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {myReviewsPagination && myReviewsPagination.totalPages > 1 && (
              <div className="pagination">
                <button
                  disabled={myReviewsPagination.currentPage === 1}
                  onClick={() => handlePageChange(myReviewsPagination.currentPage - 1)}
                  className="pagination__btn"
                >
                  {t('common.previous')}
                </button>
                
                <span className="pagination__info">
                  {t('common.pageOf', { 
                    current: myReviewsPagination.currentPage, 
                    total: myReviewsPagination.totalPages 
                  })}
                </span>
                
                <button
                  disabled={myReviewsPagination.currentPage === myReviewsPagination.totalPages}
                  onClick={() => handlePageChange(myReviewsPagination.currentPage + 1)}
                  className="pagination__btn"
                >
                  {t('common.next')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MyReviews;