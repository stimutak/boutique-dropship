import React from 'react';
import './StarRating.css';

const StarRating = ({ 
  rating, 
  onRatingChange, 
  readonly = false, 
  size = 'medium',
  showLabel = false 
}) => {
  const stars = [1, 2, 3, 4, 5];

  const handleClick = (value) => {
    if (!readonly && onRatingChange) {
      onRatingChange(value);
    }
  };

  return (
    <div className={`star-rating star-rating--${size} ${readonly ? 'star-rating--readonly' : ''}`}>
      <div className="star-rating__stars">
        {stars.map((star) => (
          <button
            key={star}
            type="button"
            className={`star-rating__star ${rating >= star ? 'star-rating__star--filled' : ''}`}
            onClick={() => handleClick(star)}
            disabled={readonly}
            aria-label={`Rate ${star} out of 5 stars`}
          >
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ))}
      </div>
      {showLabel && (
        <span className="star-rating__label">
          {rating ? `${rating.toFixed(1)} out of 5` : 'No rating'}
        </span>
      )}
    </div>
  );
};

export default StarRating;