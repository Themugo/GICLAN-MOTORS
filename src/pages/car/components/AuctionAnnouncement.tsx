import { useState, useEffect } from 'react';
import { Gavel, Clock, ExternalLink, X } from 'lucide-react';
import { formatKES } from '../../../utils/helpers';

interface AuctionAnnouncementProps {
  car: any;
  onClose?: () => void;
}

export default function AuctionAnnouncement({ car, onClose }: AuctionAnnouncementProps) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!car?.auctionEnd) return;

    const updateTimer = () => {
      const end = new Date(car.auctionEnd).getTime();
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('Auction ended');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeLeft(`${days}d ${hours % 24}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [car?.auctionEnd]);

  if (!car?.auctionStatus) return null;

  const isLive = car.auctionStatus === 'live';
  const isEnded = car.auctionStatus === 'ended';
  const isUpcoming = !isLive && !isEnded;

  const getStatusInfo = () => {
    if (isLive) {
      return {
        bg: 'bg-red-500/10 border-red-500/20',
        text: 'text-red-600',
        icon: Gavel,
        title: 'Live Auction',
        sub: `${car.bidsCount || 0} bid${(car.bidsCount || 0) !== 1 ? 's' : ''} · Ends in ${timeLeft}`,
      };
    }
    if (isEnded) {
      return {
        bg: 'bg-gray-500/10 border-gray-500/20',
        text: 'text-gray-600',
        icon: Clock,
        title: 'Auction Ended',
        sub: car.winner ? `Won by ${car.winner.user?.name || 'Winner'}` : 'No winner',
      };
    }
    return {
      bg: 'bg-amber-500/10 border-amber-500/20',
      text: 'text-amber-600',
      icon: Clock,
      title: 'Upcoming Auction',
      sub: 'Auction starts soon',
    };
  };

  const info = getStatusInfo();
  const Icon = info.icon;

  return (
    <div className={`rounded-xl p-4 border ${info.bg}`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${info.bg}`}>
          <Icon size={18} className={info.text} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-sans text-sm font-bold ${info.text}`}>{info.title}</span>
            {isLive && (
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </div>
          <p className="font-sans text-xs text-warm-500 mt-0.5">{info.sub}</p>

          {isLive && car.currentBid && (
            <p className="font-sans text-sm font-bold text-charcoal-900 mt-2">
              Current: {formatKES(car.currentBid)}
            </p>
          )}

          {isEnded && car.winner && (
            <p className="font-sans text-sm font-bold text-emerald-600 mt-2">
              Final Price: {formatKES(car.winner.amount || car.currentBid)}
            </p>
          )}
        </div>

        {isLive && (
          <a
            href={`/auction/${car._id}`}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-full hover:bg-red-600 transition-colors"
          >
            <ExternalLink size={12} />
            Enter
          </a>
        )}

        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 text-warm-400 hover:text-warm-600 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
