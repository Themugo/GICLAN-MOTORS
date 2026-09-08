import { useMemo } from 'react';
import { formatKES } from '../utils/helpers';

interface PricePoint {
  date: string;
  price: number;
}

interface PriceHistoryChartProps {
  history: PricePoint[];
  currentPrice: number;
}

export default function PriceHistoryChart({ history, currentPrice }: PriceHistoryChartProps) {
  const chartData = useMemo(() => {
    if (!history || history.length === 0) {
      // Demo data
      const now = new Date();
      return [
        { date: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(), price: currentPrice * 0.95 },
        { date: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(), price: currentPrice * 0.97 },
        { date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), price: currentPrice * 0.98 },
        { date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), price: currentPrice },
        { date: now.toISOString(), price: currentPrice },
      ];
    }
    return history;
  }, [history, currentPrice]);

  const minPrice = Math.min(...chartData.map(d => d.price));
  const maxPrice = Math.max(...chartData.map(d => d.price));
  const range = maxPrice - minPrice || 1;

  const height = 120;
  const width = 100;

  const points = chartData.map((d, i) => {
    const x = (i / (chartData.length - 1)) * width;
    const y = height - ((d.price - minPrice) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const priceChange = chartData.length > 1
    ? ((chartData[chartData.length - 1].price - chartData[0].price) / chartData[0].price) * 100
    : 0;

  return (
    <div className="bg-white rounded-xl border border-cream-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-sans text-sm font-bold text-charcoal-900">Price History</h3>
        <div className={`text-xs font-semibold ${priceChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(1)}%
        </div>
      </div>

      {/* Simple SVG chart */}
      <div className="relative h-[120px] mb-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
          {/* Grid lines */}
          <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#E5E1D8" strokeDasharray="2,2" />

          {/* Area fill */}
          <polygon
            points={`0,${height} ${points} ${width},${height}`}
            fill="url(#goldGradient)"
            opacity="0.2"
          />

          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke="#C9A85C"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Dots */}
          {chartData.map((d, i) => {
            const x = (i / (chartData.length - 1)) * width;
            const y = height - ((d.price - minPrice) / range) * height;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="2"
                fill="#C9A85C"
              />
            );
          })}

          <defs>
            <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C9A85C" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#C9A85C" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Price range */}
      <div className="flex justify-between text-xs">
        <div>
          <span className="text-warm-400">Low: </span>
          <span className="font-semibold text-charcoal-900">{formatKES(minPrice)}</span>
        </div>
        <div>
          <span className="text-warm-400">High: </span>
          <span className="font-semibold text-charcoal-900">{formatKES(maxPrice)}</span>
        </div>
      </div>
    </div>
  );
}
