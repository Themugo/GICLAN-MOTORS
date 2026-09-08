import { useState, type FormEvent } from 'react';
import { Star, MessageCircle } from 'lucide-react';
import { timeAgo } from '../../../../utils/helpers';
import { reviewsAPI } from '../../../../api/api.exports';

interface Review {
  _id: string;
  user: { name: string; avatar?: string };
  rating: number;
  comment: string;
  createdAt: string;
}

interface CarDetailReviewsProps {
  reviews: Review[];
  dealerId?: string;
  onAddReview?: () => void;
}

export default function CarDetailReviews({ reviews = [], dealerId, onAddReview }: CarDetailReviewsProps) {
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setSubmitting(true);
    try {
      if (!dealerId) return;
      await reviewsAPI.create({ dealer: dealerId, rating, comment: comment.trim() });
      
      // Reset form
      setComment('');
      setRating(5);
      setShowForm(false);
      onAddReview?.();
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (count: number, interactive = false, onRate?: (r: number) => void) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => interactive && onRate?.(star)}
            disabled={!interactive}
            className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
          >
            <Star
              size={interactive ? 20 : 14}
              className={star <= count ? 'fill-gold-500 text-gold-500' : 'text-cream-300'}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="font-serif text-2xl font-bold text-charcoal-900">{avgRating}</span>
            <span className="text-warm-400 text-sm">/ 5</span>
          </div>
          <div>
            {renderStars(Math.round(parseFloat(avgRating)))}
            <p className="text-xs text-warm-400 mt-0.5">
              Based on {reviews.length} review{reviews.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-charcoal-900 text-white text-sm font-semibold rounded-xl hover:bg-charcoal-800 transition-colors"
        >
          Write Review
        </button>
      </div>

      {/* Review form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-cream-50 rounded-xl p-5 border border-cream-200">
          <h4 className="font-sans text-sm font-semibold text-charcoal-900 mb-3">
            Rate this dealer
          </h4>
          
          {/* Star rating */}
          <div className="flex items-center gap-3 mb-4">
            {renderStars(rating, true, setRating)}
            <span className="text-sm text-warm-500">
              {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
            </span>
          </div>

          {/* Comment */}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this dealer..."
            rows={3}
            className="w-full px-4 py-3 bg-white border border-cream-200 rounded-xl font-sans text-sm text-charcoal-800 placeholder-warm-400 outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/30 resize-none"
          />

          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm font-medium text-warm-500 hover:text-warm-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !comment.trim()}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
                submitting || !comment.trim()
                  ? 'bg-cream-200 text-warm-400 cursor-not-allowed'
                  : 'bg-gold-500 text-white hover:bg-gold-600'
              }`}
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      )}

      {/* Reviews list */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review._id} className="border-b border-cream-200 pb-4 last:border-0">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 bg-cream-200 rounded-full flex items-center justify-center text-charcoal-800 font-bold text-sm">
                  {review.user?.name?.[0]?.toUpperCase() || 'U'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-sans text-sm font-semibold text-charcoal-900">
                      {review.user?.name || 'Anonymous'}
                    </span>
                    <div className="flex items-center gap-2">
                      {renderStars(review.rating)}
                      <span className="text-xs text-warm-400">
                        {timeAgo(review.createdAt)}
                      </span>
                    </div>
                  </div>
                  <p className="font-sans text-sm text-warm-500 mt-2 leading-relaxed">
                    {review.comment}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <MessageCircle size={32} className="text-cream-300 mx-auto mb-3" />
          <p className="font-sans text-sm text-warm-400">
            No reviews yet. Be the first to share your experience!
          </p>
        </div>
      )}
    </div>
  );
}
