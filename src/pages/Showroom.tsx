import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Filter, Grid, List, Search } from 'lucide-react';
import SEOHead from '../components/features/common/SEOHead';
import { LoadingPage } from '../components/features/common/LoadingPage';

interface Vehicle {
  id: number;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  fuel: string;
  transmission: string;
  image: string;
}

export default function Showroom() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return <LoadingPage />;
  }

  return (
    <>
      <SEOHead
        title="Showroom - KAYAD"
        description="Browse our showroom of vehicles"
      />

      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
          <div className="max-w-6xl mx-auto px-4">
            <h1 className="text-4xl font-bold mb-2">Kenya's Premium Automotive Gallery</h1>
            <p className="text-blue-100">Curated vehicles with escrow-backed transactions</p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold mb-6">The Gallery</h2>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search vehicles..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Filter className="h-5 w-5" />
                Filters
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
              >
                <Grid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="text-center py-12">
            <Car className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No vehicles in the showroom yet.</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Browse All Vehicles
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
