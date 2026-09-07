import React, { useState, useEffect, useCallback } from 'react';
import {
  Gavel,
  Clock,
  ShieldCheck,
  Building2,
  CheckCircle2,
  MapPin,
  Calendar,
  Play,
  Radio,
  CreditCard,
  BookOpen,
  HelpCircle,
  UserPlus,
  Bookmark,
  X,
  Search,
  Mail,
  Truck,
  FileCheck,
  Scale,
  CalendarClock,
  ClipboardCheck,
  Users,
  Lock,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { getCars, getCarById, BackendCar } from '../services/vehicleApi';
import { placeBid, BidApiError } from '../services/bidApi';
import type { UserProfile } from '../types';

// Fixed: this entire page previously ran on MOCK_AUCTIONS/
// MOCK_ORGANIZERS - fake auctions, fake bidder/spectator counts, fake
// "organizer" profiles with fabricated ratings and follower counts,
// a fake weekly calendar, a fake replay archive, and fake "browse by
// category" counts. Per explicit direction, rebuilt around real data:
// cars already carry a real auction_status ('draft' | 'live' |
// 'ended', confirmed via backend/config/swagger.js's own documented
// enum), a real current_bid, bids_count, and auction_end - fetched
// here via the same, already-proven getCars() client used throughout
// this project. "Watch Live" is now a real, in-page detail view for
// a specific live auction (not the separate, much larger, unrelated
// "Watch Live" entertainment pages - explicitly out of scope this
// pass). Sections with no real backend equivalent at all (organizer
// ratings/followers, browse-by-category counts, a weekly calendar,
// a video replay archive) were removed rather than left showing
// fabricated data. The Learning Center remains as static, informational
// content (not user-specific data, so not something to "connect").

// ---- Types ----

interface AuctionVehicle {
  id: string;
  title: string;
  image: string;
  year: number;
  mileage: string;
  fuel: string;
  transmission: string;
  location: string;
}

interface Auction {
  id: string;
  vehicle: AuctionVehicle;
  status: 'live' | 'draft' | 'ended';
  currentBid: number;
  startingBid: number;
  bidsCount: number;
  endsAt: string | null;
  startsAt: string | null;
  allowBid: boolean;
  inspected: boolean;
  // Real, when the backend's own populated dealer info is present -
  // omitted entirely otherwise, never a fabricated placeholder.
  organizerName?: string;
  organizerVerified?: boolean;
}

interface LearningArticle {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  readTime: string;
}

const LEARNING_ARTICLES: LearningArticle[] = [
  { id: '1', title: 'How Vehicle Auctions Work', description: 'Understanding the basics of online vehicle auctions, from registration to winning.', icon: <Gavel className="w-5 h-5" />, readTime: '5 min' },
  { id: '2', title: 'Understanding Bid Security', description: 'Learn about refundable deposits and how to protect your bidding commitment.', icon: <Scale className="w-5 h-5" />, readTime: '4 min' },
  { id: '3', title: 'Booking Vehicle Inspections', description: 'How to schedule and prepare for pre-auction vehicle inspections.', icon: <ClipboardCheck className="w-5 h-5" />, readTime: '3 min' },
  { id: '4', title: 'Winning an Auction', description: 'What happens after you win and how to proceed with payment.', icon: <CheckCircle2 className="w-5 h-5" />, readTime: '4 min' },
  { id: '5', title: 'Vehicle Collection Process', description: 'Complete guide to collecting your won vehicle, including documentation.', icon: <Truck className="w-5 h-5" />, readTime: '5 min' },
  { id: '6', title: 'Ownership Transfer', description: 'Understanding the legal requirements for transferring vehicle ownership.', icon: <FileCheck className="w-5 h-5" />, readTime: '7 min' },
];

// ---- Helpers ----

const formatCurrency = (amount: number) => `Ksh ${amount.toLocaleString()}`;
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
const formatTimeRemaining = (endTime: string | null): string => {
  if (!endTime) return 'TBD';
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  return `${hours}h ${minutes}m`;
};

function mapCarToAuction(car: BackendCar): Auction {
  const status = (car.auction_status === 'live' || car.auction_status === 'draft' || car.auction_status === 'ended')
    ? car.auction_status
    : 'draft';
  return {
    id: car.id,
    vehicle: {
      id: car.id,
      title: car.title,
      image: car.images?.[0]?.url || '',
      year: car.year,
      mileage: car.mileage ? `${car.mileage.toLocaleString()} km` : '',
      fuel: car.fuel || '',
      transmission: car.transmission || '',
      location: car.location_city || '',
    },
    status,
    currentBid: car.current_bid || 0,
    startingBid: car.starting_bid || 0,
    bidsCount: car.bids_count || 0,
    endsAt: car.auction_end || null,
    startsAt: car.auction_start_time || null,
    allowBid: Boolean(car.allow_bid),
    inspected: car.inspection_status === 'passed' || car.inspection_status === 'completed',
    organizerName: car.dealer?.businessName || car.dealer?.name,
    // Fixed: car.dealer?.verified relied on a dealer-population
    // query that was silently failing on every request (a real,
    // separate backend defect - a non-existent column name -
    // fixed directly in backend/controllers/carController.js).
    // cars.is_verified_dealer is a real, direct column on the car
    // itself, already correctly mapped by this same client
    // (BackendCar.is_verified_dealer) - more reliable than depending
    // on the dealer join succeeding.
    organizerVerified: Boolean(car.is_verified_dealer),
  };
}

// ---- Presentational components ----

const HeroSummary: React.FC<{ liveCount: number; scheduledCount: number; totalBidsToday: number; nextAuctionTime: string }> = ({
  liveCount, scheduledCount, totalBidsToday, nextAuctionTime
}) => (
  <div className="bg-gradient-to-br from-[#1E3063] to-[#2a4080] py-12">
    <div className="max-w-7xl mx-auto px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        {[
          { label: 'Live Auctions', value: liveCount, icon: <Radio className="w-5 h-5" />, color: 'text-red-400' },
          { label: 'Scheduled', value: scheduledCount, icon: <Clock className="w-5 h-5" />, color: 'text-blue-400' },
          { label: 'Live Bids', value: totalBidsToday, icon: <Users className="w-5 h-5" />, color: 'text-amber-400' },
          { label: 'Next Starts In', value: nextAuctionTime, icon: <CalendarClock className="w-5 h-5" />, color: 'text-cyan-400', isText: true },
        ].map((item, i) => (
          <div key={i} className="text-center">
            <div className={`flex items-center justify-center mb-2 ${item.color}`}>{item.icon}</div>
            {item.isText ? (
              <p className="text-lg font-bold text-white">{item.value}</p>
            ) : (
              <p className="text-2xl font-black text-white">{item.value}</p>
            )}
            <p className="text-xs text-slate-300 mt-1">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const LiveAuctionCard: React.FC<{ auction: Auction; onWatch: () => void }> = ({ auction, onWatch }) => (
  <Card className="overflow-hidden group hover:shadow-xl transition-all duration-300">
    <div className="relative">
      <img src={auction.vehicle.image} alt={auction.vehicle.title} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
      <div className="absolute top-3 left-3 flex gap-2">
        <Badge className="bg-red-600 text-white">
          <span className="relative flex h-2 w-2 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          LIVE
        </Badge>
        {auction.inspected && (
          <Badge className="bg-emerald-500 text-white">
            <ShieldCheck className="w-3 h-3 mr-1" /> Inspected
          </Badge>
        )}
      </div>
      <div className="absolute top-3 right-3">
        <button className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors">
          <Bookmark className="w-4 h-4 text-slate-600" />
        </button>
      </div>
    </div>
    <div className="p-4">
      <h3 className="font-bold text-[#1E3063] text-sm mb-2 line-clamp-1">{auction.vehicle.title}</h3>
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
        <MapPin className="w-3 h-3" />
        <span>{auction.vehicle.location}</span>
      </div>
      <div className="bg-gradient-to-br from-[#1E3063] to-[#2a4080] rounded-lg p-3 text-white mb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-300">Current Bid</p>
            <p className="text-lg font-black">{formatCurrency(auction.currentBid)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-300">Ends In</p>
            <p className="text-sm font-bold text-amber-300">{formatTimeRemaining(auction.endsAt)}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
        <span>{auction.bidsCount} bids</span>
      </div>
      {auction.organizerName && (
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-[#1E3063] flex items-center justify-center text-white text-xs font-bold">
            {auction.organizerName.charAt(0)}
          </div>
          <span className="text-xs text-slate-600 truncate">{auction.organizerName}</span>
          {auction.organizerVerified && <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
        </div>
      )}
      <Button className="w-full bg-[#C85A32] hover:bg-[#a84a28]" onClick={onWatch}>
        <Play className="w-4 h-4 mr-2" /> Watch Live
      </Button>
    </div>
  </Card>
);

const UpcomingAuctionCard: React.FC<{ auction: Auction }> = ({ auction }) => (
  <Card className="overflow-hidden hover:shadow-lg transition-all">
    <div className="flex gap-4 p-4">
      <img src={auction.vehicle.image} alt={auction.vehicle.title} className="w-24 h-24 rounded-lg object-cover flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge className="bg-blue-100 text-blue-700 text-xs">
            <CalendarClock className="w-3 h-3 mr-1" />
            {auction.startsAt ? `Starts ${formatDate(auction.startsAt)}` : 'Date TBD'}
          </Badge>
          {auction.inspected && (
            <Badge className="bg-emerald-100 text-emerald-700 text-xs">
              <ClipboardCheck className="w-3 h-3 mr-1" /> Inspected
            </Badge>
          )}
        </div>
        <h3 className="font-bold text-[#1E3063] text-sm mb-1">{auction.vehicle.title}</h3>
        <p className="text-xs text-slate-500 mb-2">{auction.vehicle.year} {auction.vehicle.mileage && `• ${auction.vehicle.mileage}`}</p>
        {auction.organizerName && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              <span>{auction.organizerName}</span>
              {auction.organizerVerified && <ShieldCheck className="w-3 h-3 text-emerald-500" />}
            </div>
          </div>
        )}
      </div>
    </div>
    {auction.startingBid > 0 && (
      <div className="px-4 pb-4 border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Starting Bid</span>
          <span className="font-bold text-[#1E3063]">{formatCurrency(auction.startingBid)}</span>
        </div>
      </div>
    )}
  </Card>
);

const CompletedAuctionCard: React.FC<{ auction: Auction }> = ({ auction }) => (
  <Card className="overflow-hidden hover:shadow-lg transition-all">
    <div className="flex gap-4 p-4">
      <img src={auction.vehicle.image} alt={auction.vehicle.title} className="w-24 h-24 rounded-lg object-cover flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge className="bg-slate-100 text-slate-600 text-xs">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
          </Badge>
          {auction.endsAt && <span className="text-xs text-slate-500">{formatDate(auction.endsAt)}</span>}
        </div>
        <h3 className="font-bold text-[#1E3063] text-sm mb-1">{auction.vehicle.title}</h3>
        {auction.organizerName && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Building2 className="w-3 h-3" />
            <span>{auction.organizerName}</span>
          </div>
        )}
      </div>
    </div>
    <div className="px-4 pb-4 border-t border-slate-100 pt-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-slate-500">Final Price</p>
          <p className="text-lg font-black text-[#1E3063]">{formatCurrency(auction.currentBid)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{auction.bidsCount} bids</span>
        <span>{auction.bidsCount > 10 ? 'Competitive' : 'Standard'}</span>
      </div>
    </div>
  </Card>
);

const LearningArticleCard: React.FC<{ article: LearningArticle }> = ({ article }) => (
  <Card className="p-4 hover:shadow-lg transition-all cursor-pointer group">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
        {article.icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-[#1E3063] text-sm mb-1 group-hover:text-[#C85A32] transition-colors">{article.title}</h3>
        <p className="text-xs text-slate-500 mb-2 line-clamp-2">{article.description}</p>
        <span className="text-xs text-slate-400">{article.readTime} read</span>
      </div>
    </div>
  </Card>
);

const NewsletterSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubscribed(true);
  };
  return (
    <div className="bg-gradient-to-br from-[#C85A32] to-[#a84a28] py-12">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <Mail className="w-12 h-12 text-white/80 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-white mb-2">Stay in the Loop</h2>
        <p className="text-white/80 mb-6">Get notified about new auctions and exclusive events.</p>
        {subscribed ? (
          <div className="flex items-center justify-center gap-2 text-white">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Thanks for subscribing!</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <Button type="submit" className="bg-white text-[#C85A32] hover:bg-white/90 px-6">Subscribe</Button>
          </form>
        )}
      </div>
    </div>
  );
};

// Real "Watch Live" detail view - shows a specific live auction's
// real, current state (polled every 8s while open) and lets a
// signed-in user place a real bid via the existing, already-proven
// bidApi.ts client (the same one AuctionsView uses).
const WatchLiveModal: React.FC<{
  auctionId: string;
  user?: UserProfile | null;
  onClose: () => void;
  onOpenAuth?: () => void;
}> = ({ auctionId, user, onClose, onOpenAuth }) => {
  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidPhone, setBidPhone] = useState(user?.phone || '');
  const [placing, setPlacing] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      // Fixed: this previously called getCars({ limit: 1 }) - fetching
      // one arbitrary car, essentially never the actual auction being
      // watched, then searching for it in that single-item result.
      // getCarById fetches the real, specific car directly.
      const car = await getCarById(auctionId);
      if (car) setAuction(mapCarToAuction(car));
    } catch {
      // A refresh failure keeps showing the last known real state
      // rather than clearing it - only the initial load surfaces an
      // error.
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    // Fixed: simplified to fetch this specific car directly, same as
    // refresh() above, rather than fetching up to 50 live auctions
    // and searching for this one among them.
    getCarById(auctionId)
      .then((car) => {
        if (cancelled) return;
        if (car) setAuction(mapCarToAuction(car));
        else setError('This auction could not be found.');
      })
      .catch(() => {
        if (!cancelled) setError('Could not load this auction.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    const interval = setInterval(refresh, 8000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [auctionId, refresh]);

  const handleBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth?.();
      return;
    }
    const amount = Number(bidAmount);
    if (!amount || !bidPhone) {
      setBidError('Enter a valid bid amount and phone number.');
      return;
    }
    setPlacing(true);
    setBidError(null);
    try {
      await placeBid(auctionId, amount, bidPhone);
      setBidAmount('');
      await refresh();
    } catch (err) {
      setBidError(err instanceof BidApiError ? err.message : 'Could not place bid. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="font-bold text-[#1E3063] flex items-center gap-2">
            <Radio className="w-4 h-4 text-red-500" /> Watch Live
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400">
            <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
            <p className="text-sm">Loading live auction…</p>
          </div>
        ) : error ? (
          <div className="p-10 text-center text-rose-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">{error}</p>
          </div>
        ) : auction ? (
          <div className="p-4 space-y-4">
            <img src={auction.vehicle.image} alt={auction.vehicle.title} className="w-full h-40 object-cover rounded-xl" />
            <div>
              <h3 className="font-bold text-[#1E3063]">{auction.vehicle.title}</h3>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" /> {auction.vehicle.location}
              </p>
            </div>
            <div className="bg-gradient-to-br from-[#1E3063] to-[#2a4080] rounded-xl p-4 text-white grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-slate-300">Current Bid</p>
                <p className="text-base font-black">{formatCurrency(auction.currentBid)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-300">Bids</p>
                <p className="text-base font-black">{auction.bidsCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-300">Ends In</p>
                <p className="text-base font-black text-amber-300">{formatTimeRemaining(auction.endsAt)}</p>
              </div>
            </div>

            {auction.allowBid ? (
              <form onSubmit={handleBid} className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-600 block">Place a real bid</label>
                <input
                  type="number"
                  placeholder={`More than ${formatCurrency(auction.currentBid)}`}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
                <input
                  type="tel"
                  placeholder="Phone number for bid confirmation"
                  value={bidPhone}
                  onChange={(e) => setBidPhone(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
                {bidError && <p className="text-xs text-rose-600">{bidError}</p>}
                <Button type="submit" disabled={placing} className="w-full bg-[#C85A32] hover:bg-[#a84a28]">
                  {placing ? 'Placing Bid…' : user ? 'Place Bid' : 'Sign In to Bid'}
                </Button>
              </form>
            ) : (
              <p className="text-xs text-slate-400 text-center pt-2 border-t border-slate-100">Bidding is not currently open on this auction.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ---- Main Component ----

interface AuctionDiscoveryNetworkProps {
  user?: UserProfile | null;
  onOpenAuth?: () => void;
}

const AuctionDiscoveryNetwork: React.FC<AuctionDiscoveryNetworkProps> = ({ user, onOpenAuth }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [liveAuctions, setLiveAuctions] = useState<Auction[]>([]);
  const [upcomingAuctions, setUpcomingAuctions] = useState<Auction[]>([]);
  const [completedAuctions, setCompletedAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [watchingId, setWatchingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    Promise.all([
      getCars({ limit: 50, auctionStatus: 'live' }),
      getCars({ limit: 50, auctionStatus: 'draft' }),
      getCars({ limit: 20, auctionStatus: 'ended' }),
    ])
      .then(([live, upcoming, ended]) => {
        if (cancelled) return;
        setLiveAuctions((live.data || []).map(mapCarToAuction));
        setUpcomingAuctions((upcoming.data || []).map(mapCarToAuction));
        setCompletedAuctions((ended.data || []).map(mapCarToAuction));
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load auctions. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const searchLower = searchQuery.trim().toLowerCase();
  const filterBySearch = (a: Auction) => !searchLower || a.vehicle.title.toLowerCase().includes(searchLower) || a.vehicle.location.toLowerCase().includes(searchLower);

  const filteredLive = liveAuctions.filter(filterBySearch);
  const filteredUpcoming = upcomingAuctions.filter(filterBySearch);
  const filteredCompleted = completedAuctions.filter(filterBySearch);

  const nextAuctionTime = upcomingAuctions.length > 0 && upcomingAuctions[0].startsAt
    ? formatTimeRemaining(upcomingAuctions[0].startsAt)
    : 'N/A';
  const totalBids = liveAuctions.reduce((sum, a) => sum + a.bidsCount, 0);

  return (
    <div className="min-h-screen bg-[#F6F1E8]">
      <HeroSummary
        liveCount={liveAuctions.length}
        scheduledCount={upcomingAuctions.length}
        totalBidsToday={totalBids}
        nextAuctionTime={nextAuctionTime}
      />

      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search auctions by vehicle or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3063]/30"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
            <p className="text-sm">Loading auctions…</p>
          </div>
        ) : loadError ? (
          <div className="py-20 text-center text-rose-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">{loadError}</p>
          </div>
        ) : (
          <>
            {/* Live Now */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-black text-[#1E3063] flex items-center gap-2">
                  <Radio className="w-5 h-5 text-red-500" /> Live Now
                </h2>
                <span className="text-xs text-slate-500">{filteredLive.length} active auctions</span>
              </div>
              {filteredLive.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">No live auctions right now. Check back soon.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredLive.map((a) => (
                    <LiveAuctionCard key={a.id} auction={a} onWatch={() => setWatchingId(a.id)} />
                  ))}
                </div>
              )}
            </section>

            {/* Starting Soon */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-black text-[#1E3063]">Starting Soon</h2>
                <span className="text-xs text-slate-500">Beginning soon</span>
              </div>
              {filteredUpcoming.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">No upcoming auctions scheduled right now.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredUpcoming.map((a) => <UpcomingAuctionCard key={a.id} auction={a} />)}
                </div>
              )}
            </section>

            {/* Recently Completed */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-black text-[#1E3063]">Recently Completed</h2>
              </div>
              {filteredCompleted.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">No completed auctions to show yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCompleted.map((a) => <CompletedAuctionCard key={a.id} auction={a} />)}
                </div>
              )}
            </section>

            {/* Auction Learning Center - static, informational content */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                <h2 className="text-2xl font-black text-[#1E3063]">Auction Learning Center</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {LEARNING_ARTICLES.map((a) => <LearningArticleCard key={a.id} article={a} />)}
              </div>
            </section>
          </>
        )}
      </div>

      <NewsletterSection />

      {watchingId && (
        <WatchLiveModal
          auctionId={watchingId}
          user={user}
          onClose={() => setWatchingId(null)}
          onOpenAuth={onOpenAuth}
        />
      )}
    </div>
  );
};

export default AuctionDiscoveryNetwork;
