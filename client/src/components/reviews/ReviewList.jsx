import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { fetchProductReviews, markReviewHelpful } from '../../store/slices/reviewsSlice';
import StarRating from './StarRating';
import './ReviewList.css';

const ReviewList = ({ productId }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  
  const reviewData = useSelector(state => state.reviews.productReviews[productId]);
  const loading = useSelector(state => state.reviews.productReviewsLoading);
  const error = useSelector(state => state.reviews.productReviewsError);

  useEffect(() => {
    if (productId) {
      dispatch(fetchProductReviews({ productId }));
    }
  }, [dispatch, productId]);

  const handleHelpful = async (reviewId, helpful) => {
    if (!user) {
      alert(t('reviews.loginToVote'));
      return;
    }
    await dispatch(markReviewHelpful({ reviewId, helpful }));
  };

  if (loading) {
    return <div className="reviews-loading">{t('common.loading')}</div>;
  }

  if (error) {
    return <div className="reviews-error">{t('reviews.loadError')}</div>;
  }

  if (!reviewData) {
    return null;
  }

  const { reviews, stats, pagination } = reviewData;

  return (
    <div className="review-list">
      <div className="review-list__header">
        <h3 className="review-list__title">{t('reviews.customerReviews')}</h3>
        {stats && (
          <div className="review-list__stats">
            <div className="review-list__average">
              <StarRating rating={stats.averageRating} readonly size="large" />
              <span className="review-list__average-text">
                {stats.averageRating.toFixed(1)} {t('reviews.outOf5')}
              </span>
            </div>
            <div className="review-list__count">
              {stats.totalReviews} {t('reviews.reviews', { count: stats.totalReviews })}
            </div>
            {stats.ratingDistribution && (
              <div className="review-list__distribution">
                {[5, 4, 3, 2, 1].map(rating => (
                  <div key={rating} className="review-list__distribution-row">
                    <span className="review-list__distribution-label">
                      {rating} {t('reviews.stars')}
                    </span>
                    <div className="review-list__distribution-bar">
                      <div 
                        className="review-list__distribution-fill"
                        style={{ width: stats.totalReviews > 0 ? `${(stats.ratingDistribution[rating] || 0) / stats.totalReviews * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="review-list__distribution-count">
                      {stats.ratingDistribution[rating] || 0}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {reviews && reviews.length > 0 ? (
        <div className="review-list__reviews">
          {reviews.map(review => (
            <div key={review._id} className="review-item">
              <div className="review-item__header">
                <div className="review-item__user">
                  <strong>{review.user?.name || t('reviews.anonymous')}</strong>
                  <span className="review-item__date">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <StarRating rating={review.rating} readonly size="small" />
              </div>
              
              <p className="review-item__comment">{review.comment}</p>
              
              <div className="review-item__actions">
                <span className="review-item__helpful-text">
                  {t('reviews.wasHelpful')}
                </span>
                <button
                  className={`review-item__vote-btn ${review.userVote === 'helpful' ? 'active' : ''}`}
                  onClick={() => handleHelpful(review._id, true)}
                  disabled={!user}
                >
                  {t('reviews.yes')} ({review.helpfulCount || 0})
                </button>
                <button
                  className={`review-item__vote-btn ${review.userVote === 'unhelpful' ? 'active' : ''}`}
                  onClick={() => handleHelpful(review._id, false)}
                  disabled={!user}
                >
                  {t('reviews.no')} ({review.unhelpfulCount || 0})
                </button>
              </div>
            </div>
          ))}
          
          {pagination && pagination.pages > 1 && (
            <div className="review-list__pagination">
              <button
                disabled={pagination.page === 1}
                onClick={() => dispatch(fetchProductReviews({ 
                  productId, 
                  page: pagination.page - 1 
                }))}
              >
                {t('common.previous')}
              </button>
              <span>
                {t('common.pageOf', { 
                  current: pagination.page, 
                  total: pagination.pages 
                })}
              </span>
              <button
                disabled={pagination.page === pagination.pages}
                onClick={() => dispatch(fetchProductReviews({ 
                  productId, 
                  page: pagination.page + 1 
                }))}
              >
                {t('common.next')}
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="review-list__empty">{t('reviews.noReviews')}</p>
      )}
    </div>
  );
};

export default ReviewList;