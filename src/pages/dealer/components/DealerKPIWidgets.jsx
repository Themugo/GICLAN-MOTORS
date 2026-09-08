// KPI Widgets for Dealer Dashboard - Inventory, Revenue, Auctions, Escrow

import { Car, DollarSign, Gavel, Shield, TrendingUp, TrendingDown } from 'lucide-react';

const widgetStyle = {
  background: 'var(--card)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 'var(--radius-lg)',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
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
};

const metricGrid = {
  display: 'grid',
  gap: '12px',
};

const metricStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 14px',
  background: 'rgba(255,255,255,0.02)',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.04)',
};

const metricLabel = {
  fontSize: '12px',
  color: 'rgba(255,255,255,0.5)',
  fontWeight: '500',
};

const metricValue = {
  fontSize: '16px',
  fontWeight: '800',
  color: '#fff',
  fontFamily: 'var(--font-display)',
  fontStyle: 'italic',
};

const formatCurrency = (value) => {
  if (!value && value !== 0) return '—';
  if (value >= 1e6) return `KES ${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `KES ${Math.round(value / 1e3)}K`;
  return `KES ${value.toLocaleString()}`;
};

// =============================
// INVENTORY WIDGET
// =============================
export function InventoryKPI({ cars = [] }) {
  const totalCars = cars.length;
  const activeCars = cars.filter(c => c.status === 'active' || !c.status).length;
  const pendingCars = cars.filter(c => c.status === 'pending').length;
  const soldCars = cars.filter(c => c.status === 'sold').length;

  return (
    <div style={widgetStyle}>
      <div style={widgetHeader}>
        <Car size={16} style={{ color: 'var(--gold)' }} />
        Inventory
      </div>
      <div style={metricGrid}>
        <div style={metricStyle}>
          <span style={metricLabel}>Total Cars</span>
          <span style={metricValue}>{totalCars}</span>
        </div>
        <div style={metricStyle}>
          <span style={metricLabel}>Active</span>
          <span style={{ ...metricValue, color: '#22c55e' }}>{activeCars}</span>
        </div>
        <div style={metricStyle}>
          <span style={metricLabel}>Pending Approval</span>
          <span style={{ ...metricValue, color: '#f97316' }}>{pendingCars}</span>
        </div>
        <div style={metricStyle}>
          <span style={metricLabel}>Sold</span>
          <span style={{ ...metricValue, color: '#3b82f6' }}>{soldCars}</span>
        </div>
      </div>
    </div>
  );
}

// =============================
// REVENUE WIDGET
// =============================
export function RevenueKPI({ earnings = [] }) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const todayRevenue = earnings
    .filter(e => new Date(e.date || e.createdAt) >= todayStart)
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const weekRevenue = earnings
    .filter(e => new Date(e.date || e.createdAt) >= weekStart)
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const monthRevenue = earnings
    .filter(e => new Date(e.date || e.createdAt) >= monthStart)
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const lifetimeRevenue = earnings.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div style={widgetStyle}>
      <div style={widgetHeader}>
        <DollarSign size={16} style={{ color: '#22c55e' }} />
        Revenue
      </div>
      <div style={metricGrid}>
        <div style={metricStyle}>
          <span style={metricLabel}>Today</span>
          <span style={metricValue}>{formatCurrency(todayRevenue)}</span>
        </div>
        <div style={metricStyle}>
          <span style={metricLabel}>This Week</span>
          <span style={metricValue}>{formatCurrency(weekRevenue)}</span>
        </div>
        <div style={metricStyle}>
          <span style={metricLabel}>This Month</span>
          <span style={metricValue}>{formatCurrency(monthRevenue)}</span>
        </div>
        <div style={metricStyle}>
          <span style={metricLabel}>Lifetime</span>
          <span style={{ ...metricValue, color: 'var(--gold)' }}>{formatCurrency(lifetimeRevenue)}</span>
        </div>
      </div>
    </div>
  );
}

// =============================
// AUCTIONS WIDGET
// =============================
export function AuctionsKPI({ cars = [] }) {
  const now = new Date();

  const liveAuctions = cars.filter(c => {
    const start = c.auctionStartTime ? new Date(c.auctionStartTime).getTime() : 0;
    const end = c.auctionEnd ? new Date(c.auctionEnd).getTime() : 0;
    return start > 0 && end > 0 && start <= now.getTime() && end > now.getTime();
  }).length;

  const wonAuctions = cars.filter(c => c.auctionStatus === 'won' || c.status === 'sold').length;

  const expiredAuctions = cars.filter(c => {
    const end = c.auctionEnd ? new Date(c.auctionEnd).getTime() : 0;
    return end > 0 && end < now.getTime() && c.auctionStatus !== 'won';
  }).length;

  return (
    <div style={widgetStyle}>
      <div style={widgetHeader}>
        <Gavel size={16} style={{ color: '#f97316' }} />
        Auctions
      </div>
      <div style={metricGrid}>
        <div style={metricStyle}>
          <span style={metricLabel}>Live</span>
          <span style={{ ...metricValue, color: '#ef4444' }}>{liveAuctions}</span>
        </div>
        <div style={metricStyle}>
          <span style={metricLabel}>Won</span>
          <span style={{ ...metricValue, color: '#22c55e' }}>{wonAuctions}</span>
        </div>
        <div style={metricStyle}>
          <span style={metricLabel}>Expired</span>
          <span style={{ ...metricValue, color: '#6b7280' }}>{expiredAuctions}</span>
        </div>
      </div>
    </div>
  );
}

// =============================
// ESCROW WIDGET
// =============================
export function EscrowKPI({ escrows = [] }) {
  const pendingEscrows = escrows.filter(e => e.status === 'pending' || e.status === 'active').length;
  const releasedEscrows = escrows.filter(e => e.status === 'released' || e.status === 'completed').length;
  const disputedEscrows = escrows.filter(e => e.status === 'disputed' || e.status === 'failed').length;

  return (
    <div style={widgetStyle}>
      <div style={widgetHeader}>
        <Shield size={16} style={{ color: '#a855f7' }} />
        Escrow
      </div>
      <div style={metricGrid}>
        <div style={metricStyle}>
          <span style={metricLabel}>Pending</span>
          <span style={{ ...metricValue, color: '#f97316' }}>{pendingEscrows}</span>
        </div>
        <div style={metricStyle}>
          <span style={metricLabel}>Released</span>
          <span style={{ ...metricValue, color: '#22c55e' }}>{releasedEscrows}</span>
        </div>
        <div style={metricStyle}>
          <span style={metricLabel}>Disputed</span>
          <span style={{ ...metricValue, color: '#ef4444' }}>{disputedEscrows}</span>
        </div>
      </div>
    </div>
  );
}

// =============================
// COMBINED KPI ROW
// =============================
export function DealerKPIRow({ cars = [], earnings = [], escrows = [] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 16, marginBottom: 24 }}>
      <InventoryKPI cars={cars} />
      <RevenueKPI earnings={earnings} />
      <AuctionsKPI cars={cars} />
      <EscrowKPI escrows={escrows} />
    </div>
  );
}
