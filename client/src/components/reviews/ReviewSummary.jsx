import React from 'react';
import StarRating from './StarRating';
import './ReviewSummary.css';

const ReviewSummary = ({ averageRating, totalReviews, size = 'small' }) => {
  if (!totalReviews || totalReviews === 0) {
    return null;
  }

  return (
    <div className={`review-summary review-summary--${size}`}>
      <StarRating rating={averageRating} readonly size={size} />
      <span className="review-summary__count">
        ({totalReviews})
      </span>
    </div>
  );
};

export default ReviewSummary;