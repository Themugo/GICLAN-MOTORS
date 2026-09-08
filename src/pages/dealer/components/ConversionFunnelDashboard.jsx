import { useState, useEffect } from 'react';
import { Filter, TrendingUp, Users, DollarSign, Shield } from 'lucide-react';
import { api } from '../../../api/api';

const widgetStyle = {
  background: 'var(--card)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 'var(--radius-lg)',
  padding: '20px',
};

const widgetHeader = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  fontSize: '13px',
  fontWeight: '700',
  color: 'rgba(255,255,255,0.7)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '16px',
};

const stageStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 14px',
  background: 'rgba(255,255,255,0.02)',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.04)',
  marginBottom: '8px',
};

const stageLabel = {
  fontSize: '12px',
  color: 'rgba(255,255,255,0.6)',
  fontWeight: '500',
};

const stageValue = {
  fontSize: '16px',
  fontWeight: '800',
  color: '#fff',
  fontFamily: 'var(--font-display)',
  fontStyle: 'italic',
};

const conversionRateStyle = {
  fontSize: '11px',
  color: 'rgba(255,255,255,0.4)',
  fontWeight: '600',
};

const STAGES = [
  { key: 'views', label: 'Views', icon: Users, color: '#3b82f6' },
  { key: 'favorited', label: 'Favorites', icon: Filter, color: '#a855f7' },
  { key: 'chatted', label: 'Chats', icon: Users, color: '#22c55e' },
  { key: 'offered', label: 'Offers', icon: DollarSign, color: '#f97316' },
  { key: 'escrowInitiated', label: 'Escrow', icon: Shield, color: '#ef4444' },
  { key: 'sold', label: 'Sales', icon: TrendingUp, color: 'var(--gold)' },
];

export default function ConversionFunnelDashboard({ dealerId }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/funnel/dealer/analytics');
        if (!ignore && res.data?.success) {
          setAnalytics(res.data.analytics);
        }
      } catch (error) {
        console.error('Failed to fetch funnel analytics:', error);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchAnalytics();
    return () => { ignore = true; };
  }, [dealerId]);

  if (loading) {
    return (
      <div style={widgetStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Filter size={16} style={{ color: 'var(--gold)' }} />
          <span style={widgetHeader}>Conversion Funnel</span>
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div style={widgetStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Filter size={16} style={{ color: 'var(--gold)' }} />
          <span style={widgetHeader}>Conversion Funnel</span>
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>No analytics data available</div>
      </div>
    );
  }

  const total = analytics.total;
  const calculateConversionRate = (current, previous) => {
    if (previous === 0) return 0;
    return ((current / previous) * 100).toFixed(1);
  };

  return (
    <div style={widgetStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Filter size={16} style={{ color: 'var(--gold)' }} />
        <span style={widgetHeader}>Conversion Funnel</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {STAGES.map((stage, index) => {
          const Icon = stage.icon;
          const value = total[stage.key] || 0;
          const previousValue = index > 0 ? (total[STAGES[index - 1].key] || 0) : value;
          const conversionRate = calculateConversionRate(value, previousValue);

          return (
            <div key={stage.key} style={stageStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: `${stage.color}16`,
                  color: stage.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icon size={14} />
                </div>
                <div>
                  <div style={stageLabel}>{stage.label}</div>
                  {index > 0 && (
                    <div style={conversionRateStyle}>
                      {conversionRate}% conversion from {STAGES[index - 1].label}
                    </div>
                  )}
                </div>
              </div>
              <div style={stageValue}>{value.toLocaleString()}</div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(37, 99, 235,0.06)', borderRadius: 8, border: '1px solid rgba(37, 99, 235,0.15)' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Business Insights</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
          {total.views > 0 && total.chatted === 0 && (
            <div style={{ color: '#ef4444', fontWeight: 600 }}>Low engagement: Consider improving listing quality or pricing</div>
          )}
          {total.views > 0 && total.chatted > 0 && total.offered === 0 && (
            <div style={{ color: '#f97316', fontWeight: 600 }}>High interest, no offers: Pricing may be too high</div>
          )}
          {total.offered > 0 && total.escrowInitiated === 0 && (
            <div style={{ color: '#a855f7', fontWeight: 600 }}>Offers received but no escrow: Follow up with buyers</div>
          )}
          {total.sold > 0 && (
            <div style={{ color: '#22c55e', fontWeight: 600 }}>Sales active: Keep momentum going!</div>
          )}
        </div>
      </div>
    </div>
  );
}
