import { useState } from 'react';
import { createReview } from '../../../services/reviewApi';

export default function CarDetailReviews({ dealerId, carId, reviews, isAuth, isOwner, onReviewSubmitted }) {
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuth) return;
    setSubmittingReview(true);
    try {
      await createReview({ ...reviewForm, dealer: dealerId, carId });
      setReviewForm({ rating: 5, comment: '' });
      if (onReviewSubmitted) onReviewSubmitted();
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally { setSubmittingReview(false); }
  };

  return (
    <div className="detail-card">
      <div className="detail-section-label">Dealer Reviews {reviews.length > 0 && `(${reviews.length})`}</div>
      {reviews.length === 0 ? (
        <div className="reviews-empty">No reviews yet. Be the first to review this dealer.</div>
      ) : reviews.slice(0, 4).map(r => (
        <div key={r._id} className="review-item">
          <div className="review-header">
            <span className="review-author">{r.reviewer?.name || 'Anonymous'}</span>
            <span className="review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
          </div>
          <p className="review-comment">{r.comment}</p>
        </div>
      ))}

      {isAuth && !isOwner && (
        <form onSubmit={handleSubmit} className="review-form">
          <div className="review-field">
            <label className="review-label">Rating</label>
            <select value={reviewForm.rating} onChange={e => setReviewForm(p => ({ ...p, rating: Number(e.target.value) }))} className="review-select">
              {[5,4,3,2,1].map(n => <option key={n} value={n}>{'★'.repeat(n)} — {n} star{n !== 1 ? 's' : ''}</option>)}
            </select>
          </div>
          <div className="review-field">
            <label className="review-label">Comment</label>
            <textarea rows={3} placeholder="Share your experience with this dealer…" value={reviewForm.comment}
              onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))} className="review-textarea" />
          </div>
          <button type="submit" disabled={submittingReview || !reviewForm.comment}
            className={`review-submit ${reviewForm.comment ? 'review-submit-active' : ''}`}>
            {submittingReview ? 'Submitting…' : 'Submit Review'}
          </button>
        </form>
      )}
    </div>
  );
}
