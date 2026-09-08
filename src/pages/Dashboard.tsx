import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SEOHead from '../components/features/common/SEOHead';

export default function Dashboard() {
  const { user, isDealer, isAdmin } = useAuth();
  const navigate = useNavigate();
  const isInspector = user?.role === 'ghost_checker';

  useEffect(() => {
    // Redirect based on user role
    if (isAdmin) {
      navigate('/admin', { replace: true });
    } else if (isDealer) {
      navigate('/dealer', { replace: true });
    } else if (isInspector) {
      navigate('/inspector/dashboard', { replace: true });
    }
  }, [user, isAdmin, isDealer, isInspector, navigate]);

  return (
    <>
      <SEOHead
        title="Dashboard - KAYAD"
        description="Your KAYAD dashboard"
      />

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Welcome back, {user?.name || 'User'}
          </h1>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Active Listings</h3>
              <p className="text-3xl font-bold text-blue-600">0</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Pending Orders</h3>
              <p className="text-3xl font-bold text-yellow-600">0</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Total Sales</h3>
              <p className="text-3xl font-bold text-green-600">KES 0</p>
            </div>
          </div>

          <div className="mt-8 bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => navigate('/gallery')}
                className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left"
              >
                <div className="text-2xl mb-2">🚗</div>
                <div className="font-semibold text-gray-900">Browse Cars</div>
                <div className="text-sm text-gray-500">View all listings</div>
              </button>
              <button
                onClick={() => navigate('/auction')}
                className="p-4 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors text-left"
              >
                <div className="text-2xl mb-2">🏷️</div>
                <div className="font-semibold text-gray-900">Live Auctions</div>
                <div className="text-sm text-gray-500">Bid on vehicles</div>
              </button>
              <button
                onClick={() => navigate('/escrow')}
                className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-left"
              >
                <div className="text-2xl mb-2">🛡️</div>
                <div className="font-semibold text-gray-900">Escrow</div>
                <div className="text-sm text-gray-500">Protected deals</div>
              </button>
              <button
                onClick={() => navigate('/chat')}
                className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-left"
              >
                <div className="text-2xl mb-2">💬</div>
                <div className="font-semibold text-gray-900">Messages</div>
                <div className="text-sm text-gray-500">Chat with dealers</div>
              </button>
            </div>
          </div>

          <div className="mt-8 bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
            <p className="text-gray-600">No recent activity to display. Start by browsing our vehicle gallery.</p>
            <button
              onClick={() => navigate('/gallery')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Vehicles
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
