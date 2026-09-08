import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ArrowLeft, Trash2, Bell, ArrowRight, Loader2 } from 'lucide-react';
import { favoritesAPI } from '../api/api';
import { useToast } from '../context/ToastContext';

interface FavoritesProps {
  setPage: (page: string) => void;
  viewCar: (car: any) => void;
}

export default function Favorites({ setPage, viewCar }: FavoritesProps) {
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      setLoading(true);
      try {
        const data = await favoritesAPI.list();
        const favs = (data.favorites || data || []).map((f: any) => ({
          ...f.car,
          id: f.car?._id || f.car?.id || f.favoriteId,
          savedAt: f.createdAt,
          priceAlert: f.notifyOnPriceDrop || false,
        }));
        setFavorites(favs);
      } catch (err) {
        console.error('Failed to load favorites:', err);
        toast('Failed to load favorites', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchFavorites();
  }, []);

  const removeFavorite = async (id: string | number) => {
    try {
      await favoritesAPI.remove(String(id));
      setFavorites(prev => prev.filter(f => f.id !== id));
      toast('Removed from favorites', 'success');
    } catch (err) {
      toast('Failed to remove favorite', 'error');
    }
  };

  const togglePriceAlert = async (id: string | number, currentState: boolean) => {
    try {
      await favoritesAPI.setPriceAlert(String(id), !currentState);
      setFavorites(prev => prev.map(f =>
        f.id === id ? { ...f, priceAlert: !currentState } : f
      ));
      toast(!currentState ? 'Price alert enabled' : 'Price alert disabled', 'success');
    } catch (err) {
      toast('Failed to update price alert', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 pt-16 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-gold-500 animate-spin" />
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="min-h-screen bg-cream-50 pt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="w-20 h-20 bg-cream-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart size={32} className="text-warm-400" />
          </div>
          <h1 className="font-serif text-3xl text-charcoal-900 font-bold mb-4">
            No Saved Vehicles
          </h1>
          <p className="font-sans text-warm-500 mb-8">
            Start saving vehicles you're interested in by clicking the heart icon on any listing.
          </p>
          <button
            onClick={() => setPage('gallery')}
            className="btn-gold"
          >
            Browse Vehicles <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 pt-16">
      {/* Header */}
      <div className="bg-charcoal-900 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="section-label text-gold-400 mb-2">Saved</p>
              <h1 className="font-serif text-3xl text-white font-bold">
                My Favorites
              </h1>
              <p className="text-white/50 text-sm mt-1">
                {favorites.length} vehicle{favorites.length !== 1 ? 's' : ''} saved
              </p>
            </div>
            <button
              onClick={() => setPage('gallery')}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/20 transition-colors"
            >
              <ArrowLeft size={14} /> Browse More
            </button>
          </div>
        </div>
      </div>

      {/* Favorites List */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-4">
          {favorites.map(favorite => (
            <div
              key={favorite.id}
              className="bg-white rounded-2xl border border-cream-200 overflow-hidden hover:shadow-lg hover:border-gold-500/30 transition-all duration-200"
            >
              <div className="flex flex-col sm:flex-row">
                {/* Image */}
                <div
                  className="sm:w-64 h-48 sm:h-auto flex-shrink-0 cursor-pointer group"
                  onClick={() => viewCar(favorite)}
                >
                  <img
                    src={favorite.image}
                    alt={`${favorite.make} ${favorite.model}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 p-5 flex flex-col">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="section-label mb-1">{favorite.make}</p>
                      <h3
                        className="font-serif text-xl text-charcoal-900 font-semibold cursor-pointer hover:text-gold-600 transition-colors"
                        onClick={() => viewCar(favorite)}
                      >
                        {favorite.model}
                      </h3>

                      {/* Specs */}
                      <div className="flex flex-wrap gap-3 text-sm text-warm-500 mt-2">
                        <span>{favorite.year}</span>
                        <span>·</span>
                        <span>{favorite.mileage}</span>
                        <span>·</span>
                        <span>{favorite.fuel}</span>
                        <span>·</span>
                        <span>{favorite.city}</span>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {favorite.badges.includes('escrow') && (
                          <span className="inline-flex px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                            Escrow Protected
                          </span>
                        )}
                        {favorite.badges.includes('auction') && (
                          <span className="inline-flex px-2.5 py-1 bg-gold-100 text-gold-700 text-xs font-semibold rounded-full">
                            On Auction
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-serif text-2xl text-charcoal-900 font-bold">
                        KES {favorite.price.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-auto pt-4 border-t border-cream-200 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => togglePriceAlert(favorite.id, favorite.priceAlert)}
                        className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                          favorite.priceAlert
                            ? 'text-emerald-600'
                            : 'text-warm-400 hover:text-warm-600'
                        }`}
                      >
                        <Bell size={14} />
                        {favorite.priceAlert ? 'Alert On' : 'Alert Off'}
                      </button>
                      <span className="text-xs text-warm-400">
                        Saved {formatDate(favorite.savedAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => viewCar(favorite)}
                        className="px-4 py-2 bg-charcoal-900 text-white text-sm font-medium rounded-lg hover:bg-charcoal-800 transition-colors"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => removeFavorite(favorite.id)}
                        className="p-2 text-warm-400 hover:text-red-500 transition-colors"
                        title="Remove from favorites"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state in list */}
        {favorites.length === 0 && (
          <div className="text-center py-16">
            <Heart size={48} className="text-warm-300 mx-auto mb-4" />
            <p className="font-sans text-warm-500">No favorites yet</p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link
            to="/gallery"
            className="inline-flex items-center gap-2 text-gold-700 hover:text-gold-600 font-medium transition-colors"
          >
            Browse more vehicles <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
