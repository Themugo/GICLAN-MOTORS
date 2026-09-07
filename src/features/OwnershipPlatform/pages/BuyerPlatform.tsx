import React, { useEffect, useState } from 'react';
import { Heart, ShoppingBag, ClipboardCheck, Loader2 } from 'lucide-react';
import { getFavorites, BackendFavoriteCar } from '../../../services/favoriteApi';
import { getMyEscrows, BackendEscrow } from '../../../services/escrowApi';
import { getMyInspections, BackendInspectionOrder } from '../../../services/inspectionApi';
import type { UserProfile } from '../../../types';

/**
 * Rebuilt entirely - the original ("My Garage", 2591 lines) defined
 * 13 separate data concepts (watchlist, purchase journey, inspection
 * records, finance accounts, documents, timeline events, service
 * reminders, expenses, resale valuations, reward points, messages,
 * notifications) but was driven entirely by a single hardcoded demo user object.
 *
 * Investigated each concept for a real backend equivalent before
 * rebuilding, rather than keep any of them as-is:
 * - watchlist: genuinely real - this project's own real favorites
 *   system (services/favoriteApi.ts).
 * - purchase history/ownership: genuinely real - the buyer's own real
 *   completed escrow deals (services/escrowApi.ts's getMyEscrows,
 *   filtered to this real user as buyer).
 * - inspection records: genuinely real - the buyer's own real
 *   inspection orders (services/inspectionApi.ts's getMyInspections).
 * - finance accounts, documents, service reminders, expenses, resale
 *   valuations, reward points, in-platform messages, notifications:
 *   no real backend concept exists for any of these (confirmed
 *   directly - no matching controller/table for a per-vehicle
 *   document vault, service history, valuation engine, or loyalty
 *   points system). Removed rather than fabricate a version of any of
 *   them.
 */

interface BuyerPlatformProps {
  user?: UserProfile | null;
  onNavigate?: (section: string) => void;
  onOpenAuth?: () => void;
}

export default function BuyerPlatform({ user, onNavigate, onOpenAuth }: BuyerPlatformProps) {
  const [favorites, setFavorites] = useState<BackendFavoriteCar[]>([]);
  const [escrows, setEscrows] = useState<BackendEscrow[]>([]);
  const [inspections, setInspections] = useState<BackendInspectionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    Promise.all([
      getFavorites().catch(() => ({ favorites: [] as BackendFavoriteCar[] })),
      getMyEscrows().catch(() => [] as BackendEscrow[]),
      getMyInspections().catch(() => ({ orders: [] as BackendInspectionOrder[] })),
    ]).then(([favRes, escrowRes, inspRes]) => {
      if (cancelled) return;
      setFavorites(favRes.favorites || []);
      setEscrows(escrowRes || []);
      setInspections((inspRes as { orders?: BackendInspectionOrder[] }).orders || []);
    }).catch(() => { if (!cancelled) setError('Could not load your garage.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-slate-500 mb-4">Sign in to see your saved vehicles, purchases, and inspection reports.</p>
        <button onClick={onOpenAuth} className="bg-[#1E3063] text-white text-xs font-bold rounded-lg px-5 py-2.5">
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="text-center py-6">
        <h1 className="text-2xl font-bold text-[#1E3063] font-display">My Garage</h1>
        <p className="text-sm text-slate-500 mt-1">Your saved vehicles, purchases, and inspection reports</p>
      </div>

      {error && (
        <div className="max-w-md mx-auto p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold text-center">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* WATCHLIST - real, from the real favorites system */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-4 h-4 text-[#C85A32]" />
              <h2 className="text-base font-bold text-[#1E3063]">Saved Vehicles</h2>
            </div>
            {favorites.length === 0 ? (
              <p className="text-xs text-slate-400">No saved vehicles yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {favorites.map((f) => (
                  <button
                    key={f.id || f._id}
                    onClick={() => onNavigate?.('marketplace')}
                    className="text-left bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="h-24 bg-slate-100">
                      {f.images?.[0]?.url && <img src={f.images[0].url} alt={f.title} className="w-full h-full object-cover" />}
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-semibold text-[#1E3063] truncate">{f.title}</p>
                      <p className="text-[11px] text-slate-500">Ksh {(f.price / 1000000).toFixed(2)}M</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* PURCHASES - real, from the real escrow system */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag className="w-4 h-4 text-[#C85A32]" />
              <h2 className="text-base font-bold text-[#1E3063]">My Purchases</h2>
            </div>
            {escrows.length === 0 ? (
              <p className="text-xs text-slate-400">No purchases yet.</p>
            ) : (
              <div className="space-y-2">
                {escrows.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => onNavigate?.('escrow')}
                    className="w-full text-left bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between hover:shadow-md transition-shadow"
                  >
                    <div>
                      <p className="text-xs font-semibold text-[#1E3063]">{e.car?.title || 'Vehicle'}</p>
                      <p className="text-[11px] text-slate-500 capitalize">{e.status.replace('_', ' ')}</p>
                    </div>
                    <p className="text-xs font-bold text-[#1E3063]">Ksh {(e.amount / 1000000).toFixed(2)}M</p>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* INSPECTION REPORTS - real, from the real inspection system */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <ClipboardCheck className="w-4 h-4 text-[#C85A32]" />
              <h2 className="text-base font-bold text-[#1E3063]">My Inspection Reports</h2>
            </div>
            {inspections.length === 0 ? (
              <p className="text-xs text-slate-400">No inspection reports yet.</p>
            ) : (
              <div className="space-y-2">
                {inspections.map((insp) => (
                  <button
                    key={insp.id || insp._id}
                    onClick={() => onNavigate?.('inspections')}
                    className="w-full text-left bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between hover:shadow-md transition-shadow"
                  >
                    <div>
                      <p className="text-xs font-semibold text-[#1E3063]">{insp.car?.title || 'Vehicle'}</p>
                      <p className="text-[11px] text-slate-500 capitalize">{insp.status.replace('_', ' ')}</p>
                    </div>
                    {insp.overallScore != null && (
                      <p className="text-xs font-bold text-[#1E3063]">{insp.overallScore}/100</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
