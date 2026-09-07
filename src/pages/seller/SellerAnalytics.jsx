import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { carsAPI } from '../../api/api';
import { TrendingUp, Eye, MessageCircle, DollarSign, Calendar, BarChart3 } from 'lucide-react';
import BackButton from '../../components/BackButton';

export default function SellerAnalytics() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState([]);
  const [period, setPeriod] = useState('30d');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await carsAPI.list({ seller: user?._id, limit: 100 });
      setListings(data.cars || data.data || []);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      let errorMessage = 'Could not load analytics data';
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (err.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      toast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const calculateStats = () => {
    const activeListings = listings.filter(l => l.status === 'active');
    const soldListings = listings.filter(l => l.status === 'sold');
    
    const totalViews = listings.reduce((sum, l) => sum + (l.views || 0), 0);
    const totalInquiries = listings.reduce((sum, l) => sum + (l.inquiries || 0), 0);
    const totalRevenue = soldListings.reduce((sum, l) => sum + (l.finalPrice || l.price || 0), 0);
    
    const avgViewsPerListing = activeListings.length > 0 ? totalViews / activeListings.length : 0;
    const conversionRate = totalInquiries > 0 ? (soldListings.length / totalInquiries) * 100 : 0;

    return {
      totalListings: listings.length,
      activeListings: activeListings.length,
      soldListings: soldListings.length,
      totalViews,
      totalInquiries,
      totalRevenue,
      avgViewsPerListing,
      conversionRate,
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="page loading-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 1200 }}>
        <div style={{ marginBottom: 32 }}>
          <BackButton fallback="/seller" />
          <div className="section-eyebrow">Private Seller Hub</div>
          <h2>Analytics</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6 }}>
            Track your listing performance and sales
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 mb-8">
          {['7d', '30d', '90d', 'all'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-gold text-black'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {p === 'all' ? 'All Time' : p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-8">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-2">
              <Eye size={16} className="text-gold" />
              <span className="text-white/40 text-xs uppercase tracking-wider">Total Views</span>
            </div>
            <p className="font-display font-black text-white text-3xl">
              {stats.totalViews.toLocaleString()}
            </p>
            <p className="text-white/40 text-xs mt-1">
              {stats.avgViewsPerListing.toFixed(0)} avg/listing
            </p>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle size={16} className="text-gold" />
              <span className="text-white/40 text-xs uppercase tracking-wider">Inquiries</span>
            </div>
            <p className="font-display font-black text-white text-3xl">
              {stats.totalInquiries}
            </p>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className="text-gold" />
              <span className="text-white/40 text-xs uppercase tracking-wider">Revenue</span>
            </div>
            <p className="font-display font-black text-white text-3xl">
              KES {stats.totalRevenue.toLocaleString()}
            </p>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-gold" />
              <span className="text-white/40 text-xs uppercase tracking-wider">Conversion</span>
            </div>
            <p className="font-display font-black text-white text-3xl">
              {stats.conversionRate.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Listing Performance */}
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 size={20} className="text-gold" />
            <h3 className="font-display font-bold text-white text-lg">Listing Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: 13 }}>
              <thead>
                <tr className="text-left text-white/40 text-xs uppercase tracking-wider">
                  <th className="pb-4 pr-4">Vehicle</th>
                  <th className="pb-4 pr-4">Status</th>
                  <th className="pb-4 pr-4">Views</th>
                  <th className="pb-4 pr-4">Inquiries</th>
                  <th className="pb-4">Price</th>
                </tr>
              </thead>
              <tbody>
                {listings.slice(0, 10).map(car => (
                  <tr key={car._id} className="border-t border-white/[0.04]">
                    <td className="py-4 pr-4">
                      <p className="text-white font-medium truncate max-w-[200px]">{car.title}</p>
                      <p className="text-white/40 text-xs">{car.year}</p>
                    </td>
                    <td className="py-4 pr-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        car.status === 'sold' 
                          ? 'bg-green-500/20 text-green-400' 
                          : car.status === 'active' 
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-white/10 text-white/40'
                      }`}>
                        {car.status}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-white">{car.views || 0}</td>
                    <td className="py-4 pr-4 text-white">{car.inquiries || 0}</td>
                    <td className="py-4 text-gold font-bold">KES {(car.price || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Insights */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-gold" />
              <h4 className="font-display font-bold text-white">Performance Tips</h4>
            </div>
            <ul className="space-y-3 text-white/60 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-gold">•</span>
                <span>Vehicles with 8+ photos get 3x more views</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold">•</span>
                <span>Detailed descriptions increase inquiry rate by 40%</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold">•</span>
                <span>Competitive pricing leads to faster sales</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold">•</span>
                <span>Respond to inquiries within 24 hours for best results</span>
              </li>
            </ul>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={18} className="text-gold" />
              <h4 className="font-display font-bold text-white">Summary</h4>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Total Listings</span>
                <span className="text-white font-bold">{stats.totalListings}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Active Listings</span>
                <span className="text-white font-bold">{stats.activeListings}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Sold Vehicles</span>
                <span className="text-white font-bold">{stats.soldListings}</span>
              </div>
              <div className="border-t border-white/[0.04] pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/60 text-sm">Total Revenue</span>
                  <span className="text-gold font-bold">KES {stats.totalRevenue.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
