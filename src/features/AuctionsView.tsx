import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Gavel, Clock3, Heart, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { Vehicle, UserProfile } from '../types';
import { fetchActiveAuctions } from '../services/auctionService';
import { placeBid, BidApiError } from '../services/bidApi';
import { getFavorites, toggleFavorite, FavoriteApiError } from '../services/favoriteApi';
import { PageHeader, Card, Badge, Button, LazyImage, Input } from '../components/ui';

interface AuctionsViewProps {
  vehicles: Vehicle[];
  user?: UserProfile | null;
  onOpenAuth?: () => void;
  onStartEscrow: (vehicle: Vehicle) => void;
  onQuickViewVehicle?: (vehicle: Vehicle) => void;
  onUpdateVehicleAuctionStatus?: (vehicleId: string, isAuction: boolean) => void;
}

interface AuctionRecord {
  id: string;
  carId: string;
  status: 'active' | 'ended' | 'draft';
  startingBid: number;
  highestBid: number;
  startTime: string | null;
  endTime: string | null;
  bidIncrement: number;
  reservePrice: number | null;
  bidCount: number;
  allowBid: boolean;
  car: {
    _id: string;
    title: string;
    brand?: string;
    model?: string;
    year?: number;
    price?: number;
    images?: Array<{ url?: string } | string>;
    location?: string;
    dealer?: string;
    currentBid?: number;
    bidsCount?: number;
    auctionStatus?: string;
  };
}

const imageUrl = (images?: AuctionRecord['car']['images']) => {
  const first = images?.[0];
  return typeof first === 'string' ? first : first?.url;
};

const formatKes = (value: number) => `KSh ${Number(value || 0).toLocaleString('en-KE')}`;

const timeRemaining = (endTime: string | null) => {
  if (!endTime) return 'End time unavailable';
  const ms = new Date(endTime).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return 'Auction closed';
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return hours > 24 ? `${Math.floor(hours / 24)}d ${hours % 24}h remaining` : `${hours}h ${minutes}m remaining`;
};

export const AuctionsView: React.FC<AuctionsViewProps> = ({
  vehicles,
  user,
  onOpenAuth,
  onStartEscrow,
  onQuickViewVehicle,
}) => {
  const [auctions, setAuctions] = useState<AuctionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AuctionRecord | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidBusy, setBidBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const loadAuctions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchActiveAuctions({ page: 1, limit: 100 });
      setAuctions((result?.auctions || []) as AuctionRecord[]);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load live auctions from KAYAD.');
      setAuctions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAuctions(); }, [loadAuctions]);

  useEffect(() => {
    if (!user) {
      setFavoriteIds(new Set());
      return;
    }
    getFavorites({ page: 1, limit: 100 }).then((result) => {
      setFavoriteIds(new Set((result.favorites || []).map((car) => String(car.id || car._id))));
    }).catch(() => setFavoriteIds(new Set()));
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return auctions;
    return auctions.filter((auction) =>
      [auction.car.title, auction.car.brand, auction.car.model, auction.car.location]
        .filter(Boolean).some((value) => String(value).toLowerCase().includes(q))
    );
  }, [auctions, search]);

  const toggleWatch = async (carId: string) => {
    if (!user) {
      onOpenAuth?.();
      return;
    }
    try {
      const result = await toggleFavorite(carId);
      setFavoriteIds((previous) => {
        const next = new Set(previous);
        if (result.favorited) next.add(carId); else next.delete(carId);
        return next;
      });
    } catch (err) {
      setMessage(err instanceof FavoriteApiError ? err.message : 'Could not update your watchlist.');
    }
  };

  const submitBid = async () => {
    if (!selected) return;
    if (!user) {
      onOpenAuth?.();
      return;
    }
    const amount = Number(bidAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage('Enter a valid bid amount.');
      return;
    }
    setBidBusy(true);
    setMessage(null);
    try {
      const result = await placeBid(selected.carId, amount, user.phone || '');
      if (result.success) {
        setMessage('Bid submitted successfully and accepted by the server.');
        setBidAmount('');
        await loadAuctions();
        setSelected((current) => current ? { ...current, highestBid: Math.max(current.highestBid, amount), bidCount: current.bidCount + 1 } : current);
      } else {
        setMessage(result.message || 'The server did not accept this bid.');
      }
    } catch (err) {
      setMessage(err instanceof BidApiError ? err.message : 'Unable to submit the bid.');
    } finally {
      setBidBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        badgeIcon={<Gavel className="w-4 h-4 text-amber-500" />}
        badgeText="Live vehicle auctions"
        title="Bid on verified auction listings"
        description="Auction inventory, bid state and auction timing are loaded from KAYAD's backend. No local auction records are created in the browser."
      />

      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search make, model, title or location..." className="pl-9" />
        </div>
        <Button variant="secondary" onClick={() => void loadAuctions()} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {message && <div className="p-3 rounded-xl bg-slate-100 text-slate-700 text-sm">{message}</div>}
      {error && <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <Card className="p-10 text-center">
          <Gavel className="w-8 h-8 mx-auto text-slate-400 mb-3" />
          <p className="font-bold text-slate-800">No live auctions are currently available.</p>
          <p className="text-sm text-slate-500 mt-1">This page does not manufacture auction records when the backend has none.</p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map((auction) => {
          const realVehicle = vehicles.find((vehicle) => String(vehicle.id) === String(auction.carId));
          return (
            <Card key={auction.id} className="overflow-hidden">
              <div className="relative h-48 bg-slate-100">
                {imageUrl(auction.car.images) ? <LazyImage src={imageUrl(auction.car.images)!} alt={auction.car.title} className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center text-slate-400">No image supplied</div>}
                <button onClick={() => void toggleWatch(auction.carId)} className="absolute top-3 right-3 p-2 rounded-full bg-white/90" aria-label="Save auction vehicle">
                  <Heart className={`w-4 h-4 ${favoriteIds.has(auction.carId) ? 'fill-current text-rose-500' : 'text-slate-500'}`} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2"><Badge variant="accent">LIVE</Badge><span className="text-xs text-slate-500">{timeRemaining(auction.endTime)}</span></div>
                  <h3 className="font-bold text-[#1E3063] mt-2">{auction.car.title}</h3>
                  <p className="text-xs text-slate-500">{[auction.car.year, auction.car.brand, auction.car.model, auction.car.location].filter(Boolean).join(' • ')}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-slate-400">Current bid</p><p className="font-black">{formatKes(auction.highestBid)}</p></div>
                  <div><p className="text-xs text-slate-400">Bids</p><p className="font-black">{auction.bidCount}</p></div>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => { setSelected(auction); setBidAmount(''); setMessage(null); }}>View & Bid</Button>
                  {realVehicle && <Button variant="secondary" onClick={() => onQuickViewVehicle?.(realVehicle)}>View</Button>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between gap-4">
              <div><Badge variant="accent">LIVE AUCTION</Badge><h2 className="text-xl font-black text-[#1E3063] mt-2">{selected.car.title}</h2></div>
              <button onClick={() => setSelected(null)} className="text-slate-400">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50"><p className="text-xs text-slate-500">Current bid</p><p className="text-lg font-black">{formatKes(selected.highestBid)}</p></div>
              <div className="p-4 rounded-xl bg-slate-50"><p className="text-xs text-slate-500">Ends</p><p className="text-sm font-bold flex gap-1 items-center"><Clock3 className="w-4 h-4" />{timeRemaining(selected.endTime)}</p></div>
            </div>
            <div className="p-3 rounded-xl border border-slate-200 flex gap-2 text-xs text-slate-600"><ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" /> Bids are validated and persisted by the KAYAD backend. A successful browser response is not treated as a bid unless the server confirms it.</div>
            <div className="space-y-3">
              <Input type="number" min="1" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} placeholder="Enter your bid amount (KSh)" />
              <Button fullWidth onClick={() => void submitBid()} disabled={bidBusy || !selected.allowBid}>{bidBusy ? 'Submitting…' : user ? 'Place Bid' : 'Sign In to Bid'}</Button>
              {selected.allowBid === false && <p className="text-xs text-rose-600">Bidding is not currently enabled for this auction.</p>}
            </div>
            {vehicles.some((vehicle) => String(vehicle.id) === String(selected.carId)) && (
              <Button variant="secondary" fullWidth onClick={() => { const vehicle = vehicles.find((v) => String(v.id) === String(selected.carId)); if (vehicle) onStartEscrow(vehicle); }}>Start escrow for this vehicle</Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuctionsView;
