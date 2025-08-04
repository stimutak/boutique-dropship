import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { submitReview, clearSubmitState } from '../../store/slices/reviewsSlice';
import StarRating from './StarRating';
import './ReviewForm.css';

const ReviewForm = ({ productId, onSuccess }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { submitLoading, submitError, submitSuccess } = useSelector(state => state.reviews);
  
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (submitSuccess) {
      setRating(0);
      setComment('');
      setShowForm(false);
      dispatch(clearSubmitState());
      if (onSuccess) {
        onSuccess();
      }
    }
  }, [submitSuccess, dispatch, onSuccess]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!rating) {
      alert(t('reviews.ratingRequired'));
      return;
    }

    if (comment.trim().length < 10) {
      alert(t('reviews.commentMinLength'));
      return;
    }

    await dispatch(submitReview({ productId, rating, comment: comment.trim() }));
  };

  if (!user) {
    return (
      <div className="review-form__login-prompt">
        <p>{t('reviews.loginToReview')}</p>
      </div>
    );
  }

  return (
    <div className="review-form">
      {!showForm ? (
        <button 
          className="review-form__toggle-btn"
          onClick={() => setShowForm(true)}
        >
          {t('reviews.writeReview')}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="review-form__form">
          <h4 className="review-form__title">{t('reviews.writeReview')}</h4>
          
          <div className="review-form__field">
            <label className="review-form__label">
              {t('reviews.rating')}
            </label>
            <StarRating 
              rating={rating} 
              onRatingChange={setRating}
              size="large"
            />
          </div>

          <div className="review-form__field">
            <label htmlFor="review-comment" className="review-form__label">
              {t('reviews.yourReview')}
            </label>
            <textarea
              id="review-comment"
              className="review-form__textarea"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('reviews.reviewPlaceholder')}
              rows={5}
              maxLength={1000}
              required
            />
            <div className="review-form__char-count">
              {comment.length}/1000
            </div>
          </div>

          {submitError && (
            <div className="review-form__error">
              {submitError === 'Request failed with status code 403' 
                ? t('reviews.mustPurchaseToReview') 
                : submitError}
            </div>
          )}

          <div className="review-form__actions">
            <button
              type="button"
              className="review-form__cancel-btn"
              onClick={() => {
                setShowForm(false);
                setRating(0);
                setComment('');
                dispatch(clearSubmitState());
              }}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="review-form__submit-btn"
              disabled={submitLoading || !rating || comment.trim().length < 10}
            >
              {submitLoading ? t('common.submitting') : t('reviews.submitReview')}
            </button>
          </div>

          <p className="review-form__note">
            {t('reviews.moderationNote')}
          </p>
        </form>
      )}
    </div>
  );
};

export default ReviewForm;