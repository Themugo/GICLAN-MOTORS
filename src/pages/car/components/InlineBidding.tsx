import { useState } from 'react';
import { Gavel, Clock, Users, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { formatKES } from '../../../utils/helpers';

interface InlineBiddingProps {
  car: any;
  onBidPlaced?: (amount: number) => void;
}

export default function InlineBidding({ car, onBidPlaced }: InlineBiddingProps) {
  const [bidAmount, setBidAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const currentBid = car?.currentBid || 0;
  const startingBid = car?.startingBid || currentBid || car?.price || 0;
  const minBid = currentBid > 0 ? currentBid + 5000 : startingBid;
  const bidsCount = car?.bidsCount || 0;

  // Calculate time remaining
  const auctionEnd = car?.auctionEnd ? new Date(car.auctionEnd).getTime() : 0;
  const now = Date.now();
  const timeLeft = auctionEnd > now ? auctionEnd - now : 0;

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const isLive = car?.auctionStatus === 'live' && timeLeft > 0;

  const quickBidOptions = [
    minBid,
    minBid + 10000,
    minBid + 25000,
    minBid + 50000,
  ].filter((val, idx, arr) => arr.indexOf(val) === idx && val > 0);

  const handleQuickBid = (amount: number) => {
    setBidAmount(amount.toString());
  };

  const handleSubmit = async () => {
    const amount = parseInt(bidAmount);
    if (!amount || amount < minBid) {
      setError(`Minimum bid is ${formatKES(minBid)}`);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // API call would go here
      // await bidsAPI.place(car._id, { amount });

      // Simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess(true);
      onBidPlaced?.(amount);
    } catch (err) {
      setError('Failed to place bid. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLive) {
    return (
      <div className="bg-cream-100 rounded-xl p-5 border border-cream-200">
        <div className="flex items-center gap-3 text-warm-500">
          <Gavel size={20} />
          <div>
            <p className="font-sans text-sm font-semibold">Auction Not Active</p>
            <p className="font-sans text-xs opacity-70">
              {car?.auctionStatus === 'ended'
                ? 'This auction has ended'
                : 'Auction has not started yet'
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-5 border border-cream-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Live Auction</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-warm-500">
          <Clock size={12} />
          <span>{hours}h {minutes}m remaining</span>
        </div>
      </div>

      {/* Current bid */}
      <div className="text-center mb-4">
        <p className="text-[10px] text-warm-400 uppercase tracking-wider font-bold mb-1">
          {bidsCount > 0 ? 'Current Bid' : 'Starting Bid'}
        </p>
        <p className="font-serif text-3xl text-charcoal-900 font-bold">
          {formatKES(currentBid || startingBid)}
        </p>
        <p className="text-xs text-warm-400 mt-1">
          {bidsCount} bid{bidsCount !== 1 ? 's' : ''} placed
        </p>
      </div>

      {/* Quick bid buttons */}
      <div className="flex gap-2 mb-4">
        {quickBidOptions.slice(0, 3).map((amount) => (
          <button
            key={amount}
            onClick={() => handleQuickBid(amount)}
            className={`flex-1 py-2 px-2 rounded-lg font-sans text-xs font-semibold transition-all ${
              parseInt(bidAmount) === amount
                ? 'bg-gold-500 text-white'
                : 'bg-cream-100 text-charcoal-800 hover:bg-cream-200'
            }`}
          >
            {formatKES(amount)}
          </button>
        ))}
      </div>

      {/* Custom bid input */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400 text-sm">KES</span>
          <input
            type="number"
            value={bidAmount}
            onChange={(e) => {
              setBidAmount(e.target.value);
              setError('');
            }}
            placeholder={minBid.toLocaleString()}
            min={minBid}
            className="w-full pl-12 pr-3 py-3 bg-cream-50 border border-cream-200 rounded-xl font-sans text-sm text-charcoal-800 outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/30"
          />
        </div>
      </div>

      {/* Minimum bid hint */}
      <p className="text-xs text-warm-400 mb-3">
        Minimum bid: {formatKES(minBid)}
      </p>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-xs mb-3">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="flex items-center gap-2 text-emerald-600 text-xs mb-3">
          <CheckCircle size={14} />
          <span>Bid placed successfully!</span>
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={submitting || !bidAmount}
        className={`w-full py-3 px-4 rounded-xl font-sans text-sm font-bold flex items-center justify-center gap-2 transition-all ${
          submitting || !bidAmount
            ? 'bg-cream-200 text-warm-400 cursor-not-allowed'
            : 'bg-gold-500 text-white hover:bg-gold-600'
        }`}
      >
        {submitting ? (
          <>
            <Loader size={16} className="animate-spin" />
            Placing Bid...
          </>
        ) : (
          <>
            <Gavel size={16} />
            Place Bid
          </>
        )}
      </button>

      {/* Terms */}
      <p className="text-[10px] text-warm-300 text-center mt-3">
        By placing a bid, you agree to our auction terms. A 5% commitment fee may apply.
      </p>
    </div>
  );
}
