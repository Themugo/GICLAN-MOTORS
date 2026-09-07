import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { carsAPI } from '../../../api/api';
import CartyGrid from '../../../components/CartyGrid';
import useMediaQuery from '../../../hooks/useMediaQuery';

export default function SimilarCars({ carId, brand }) {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    if (!brand) return;
    setLoading(true);
    carsAPI.list({ page: 1, limit: 5, brand, sort: '-createdAt' })
      .then(data => {
        const all = data.cars || data.data || [];
        const filtered = all.filter(c => c._id !== carId);
        setCars(filtered.slice(0, 4));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [carId, brand]);

  if (loading || cars.length === 0) return null;

  return (
    <section className="section-spacing border-t border-white/[0.04]">
      <div className="max-w-[1400px] mx-auto px-7">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[8px] text-white/20 font-semibold tracking-[0.14em] uppercase">Similar Vehicles</span>
            </div>
            <h2 className="font-display font-black italic text-[clamp(1.1rem,2vw,1.5rem)] text-white leading-none m-0">
              More <span className="text-gold">{brand}</span>
            </h2>
          </div>
          <Link to={`/showroom?brand=${brand}`} className="section-link">View All →</Link>
        </div>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {cars.map(car => (
            <div key={car._id} className="premium-card">
              <CartyGrid car={car} isMobile={isMobile} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
