import { useState, useMemo, memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Car, Users, MessageSquare, BarChart3,
  Settings, Bell, Plus, TrendingUp, ChevronDown, Menu, X,
  Package, ShoppingCart, DollarSign, Eye, Heart, Star, TrendingDown
} from 'lucide-react';
import { Vehicle } from '../../../types/index';

// Navigation items
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/dealer' },
  { id: 'inventory', label: 'Inventory', icon: Car, to: '/dealer/inventory' },
  { id: 'leads', label: 'Leads', icon: Users, to: '/dealer/leads', badge: 12 },
  { id: 'messages', label: 'Messages', icon: MessageSquare, to: '/chat', badge: 5 },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, to: '/dealer/analytics' },
];

// Metric card component
interface DealerMetricProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  accent?: 'gold' | 'views' | 'leads' | 'sales' | 'revenue' | 'inventory' | 'rating';
  className?: string;
}

export const DealerMetric = memo(function DealerMetric({
  icon,
  label,
  value,
  trend,
  trendLabel,
  accent = 'gold',
  className = ''
}: DealerMetricProps) {
  const iconColors = {
    gold: { bg: 'rgba(22, 196, 164, 0.12)', color: '#16C4A4' },
    views: { bg: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA' },
    leads: { bg: 'rgba(168, 85, 247, 0.15)', color: '#C084FC' },
    sales: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22C55E' },
    revenue: { bg: 'rgba(22, 196, 164, 0.12)', color: '#16C4A4' },
    inventory: { bg: 'rgba(251, 146, 60, 0.15)', color: '#FB923C' },
    rating: { bg: 'rgba(236, 72, 153, 0.15)', color: '#EC4899' },
  };

  const colorScheme = iconColors[accent] || iconColors.gold;

  return (
    <div className={`dealer-metric ${className}`}>
      <div className="dealer-metric__header">
        <div className="dealer-metric__icon" style={{ background: colorScheme.bg }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
        </div>
        {trend !== undefined && (
          <div className={`dealer-metric__trend dealer-metric__trend--${trend >= 0 ? 'up' : 'down'}`}>
            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="dealer-metric__value">{value}</div>
      <div className="dealer-metric__label">{label}</div>
      {trendLabel && (
        <div style={{ fontSize: 'var(--dealer-text-xs)', color: 'var(--dealer-text-dim)', marginTop: 4 }}>
          {trendLabel}
        </div>
      )}
    </div>
  );
});

// Quick action button
interface DealerActionProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  to?: string;
  onClick?: () => void;
  variant?: 'default' | 'gold';
  className?: string;
}

export const DealerAction = memo(function DealerAction({
  icon,
  label,
  description,
  to,
  onClick,
  variant = 'default',
  className = ''
}: DealerActionProps) {
  const content = (
    <>
      <div className="dealer-action__icon" style={variant === 'gold' ? {} : { background: 'var(--dealer-elevated)' }}>
        {icon}
      </div>
      <div className="dealer-action__label">{label}</div>
      {description && <div className="dealer-action__desc">{description}</div>}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={`dealer-action ${className}`}>
        {content}
      </Link>
    );
  }

  return (
    <button className={`dealer-action ${className}`} onClick={onClick} type="button">
      {content}
    </button>
  );
});

// Lead funnel component
interface DealerFunnelStage {
  type: 'new' | 'contacted' | 'interested' | 'negotiating' | 'closed';
  label: string;
  count: number;
}

interface DealerFunnelProps {
  stages: DealerFunnelStage[];
}

export const DealerFunnel = memo(function DealerFunnel({ stages }: DealerFunnelProps) {
  return (
    <div className="dealer-funnel">
      {stages.map((stage, i) => (
        <div key={i} className={`dealer-funnel-stage dealer-funnel-stage--${stage.type}`}>
          <div className="dealer-funnel-stage__count">{stage.count}</div>
          <div className="dealer-funnel-stage__label">{stage.label}</div>
        </div>
      ))}
    </div>
  );
});

// Leads table
interface Lead {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  vehicle: string;
  status: 'new' | 'contacted' | 'negotiating' | 'closed-won' | 'closed-lost';
  value: number;
  createdAt: string;
}

interface DealerLeadsTableProps {
  leads: Lead[];
  onView?: (id: string) => void;
  onContact?: (id: string) => void;
  onConvert?: (id: string) => void;
  className?: string;
}

export const DealerLeadsTable = memo(function DealerLeadsTable({
  leads,
  onView,
  onContact,
  onConvert,
  className = ''
}: DealerLeadsTableProps) {
  const statusColors = {
    new: 'dealer-leads__status--new',
    contacted: 'dealer-leads__status--contacted',
    negotiating: 'dealer-leads__status--negotiating',
    'closed-won': 'dealer-leads__status--closed-won',
    'closed-lost': 'dealer-leads__status--closed-lost',
  };

  return (
    <div className={`dealer-leads ${className}`}>
      <div className="dealer-leads__header">
        <div className="dealer-leads__title">
          Recent Leads
          <span className="dealer-leads__count">{leads.length}</span>
        </div>
        <div className="dealer-leads__filters">
          <button className="dealer-leads__filter dealer-leads__filter--active">All</button>
          <button className="dealer-leads__filter">New</button>
          <button className="dealer-leads__filter">Hot</button>
        </div>
      </div>
      <table className="dealer-leads__table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Vehicle</th>
            <th>Status</th>
            <th>Value</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="dealer-leads__row">
              <td className="dealer-leads__cell">
                <div className="dealer-leads__cell--customer">
                  <div className="dealer-leads__avatar">
                    {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className="dealer-leads__name">{lead.name}</div>
                    <div className="dealer-leads__vehicle">{lead.phone}</div>
                  </div>
                </div>
              </td>
              <td className="dealer-leads__cell">{lead.vehicle}</td>
              <td className="dealer-leads__cell">
                <span className={`dealer-leads__status ${statusColors[lead.status] || ''}`}>
                  {lead.status.replace('-', ' ')}
                </span>
              </td>
              <td className="dealer-leads__cell" style={{ fontWeight: 700, color: 'var(--dealer-gold)' }}>
                {lead.value}
              </td>
              <td className="dealer-leads__cell">
                <div className="dealer-leads__actions">
                  <button className="dealer-leads__action" onClick={() => onView?.(lead.id)} title="View">
                    <Eye size={14} />
                  </button>
                  <button className="dealer-leads__action" onClick={() => onContact?.(lead.id)} title="Contact">
                    <MessageSquare size={14} />
                  </button>
                  <button className="dealer-leads__action" onClick={() => onConvert?.(lead.id)} title="Convert">
                    <DollarSign size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

// Inventory card
interface DealerInventoryCardData {
  id: string;
  title: string;
  image?: string;
  price?: number;
  status?: string;
  featured?: boolean;
  views?: number;
  inquiries?: number;
  days?: number;
}

interface DealerInventoryCardProps {
  car: DealerInventoryCardData;
  onEdit?: () => void;
  onPromote?: () => void;
  onDelete?: () => void;
  className?: string;
}

export const DealerInventoryCard = memo(function DealerInventoryCard({
  car,
  onEdit,
  onPromote,
  onDelete,
  className = ''
}: DealerInventoryCardProps) {
  const statusMap = {
    active: 'active',
    pending: 'pending',
    sold: 'sold',
    draft: 'pending',
  };

  return (
    <div className={`dealer-inventory-card ${className}`}>
      <div className="dealer-inventory-card__image">
        <img src={car.image || 'https://images.pexels.com/photos/3593922/pexels-photo-3593922.jpeg?auto=compress&cs=tinysrgb&w=800'} alt={car.title} loading="lazy" decoding="async" />
        <div className="dealer-inventory-card__badges">
          <span className={`dealer-inventory-card__badge dealer-inventory-card__badge--${statusMap[car.status] || 'active'}`}>
            {car.status || 'Active'}
          </span>
          {car.featured && (
            <span className="dealer-inventory-card__badge dealer-inventory-card__badge--featured">
              ⭐ Featured
            </span>
          )}
        </div>
        <div className="dealer-inventory-card__menu">
          <button className="dealer-leads__action" onClick={() => onEdit?.()}>✏️</button>
        </div>
      </div>
      <div className="dealer-inventory-card__body">
        <div className="dealer-inventory-card__title">{car.title}</div>
        <div className="dealer-inventory-card__price">
          KES {car.price?.toLocaleString() || '0'}
        </div>
        <div className="dealer-inventory-card__stats">
          <div className="dealer-inventory-card__stat">
            <span className="dealer-inventory-card__stat-value">{car.views?.toLocaleString() || 0}</span>
            <span className="dealer-inventory-card__stat-label">Views</span>
          </div>
          <div className="dealer-inventory-card__stat">
            <span className="dealer-inventory-card__stat-value">{car.inquiries || 0}</span>
            <span className="dealer-inventory-card__stat-label">Inquiries</span>
          </div>
          <div className="dealer-inventory-card__stat">
            <span className="dealer-inventory-card__stat-value">{car.days || 0}</span>
            <span className="dealer-inventory-card__stat-label">Days</span>
          </div>
        </div>
      </div>
    </div>
  );
});

// Analytics chart placeholder
interface DealerChartProps {
  title: string;
  period?: string;
  children?: React.ReactNode;
  className?: string;
}

export const DealerChart = memo(function DealerChart({
  title,
  period,
  children,
  className = ''
}: DealerChartProps) {
  return (
    <div className={`dealer-chart ${className}`}>
      <div className="dealer-chart__header">
        <h3 className="dealer-chart__title">{title}</h3>
        {period && <span className="dealer-chart__period">{period}</span>}
      </div>
      <div className="dealer-chart__body">
        {children}
      </div>
    </div>
  );
});

// Insights panel
interface Insight {
  type: 'tip' | 'alert' | 'info';
  title: string;
  description: string;
}

interface DealerInsightsProps {
  insights: Insight[];
}

export const DealerInsights = memo(function DealerInsights({ insights }: DealerInsightsProps) {
  return (
    <div className="dealer-insights">
      <h3 className="dealer-insights__title">AI Insights</h3>
      {insights.map((insight, i) => (
        <div key={i} className="dealer-insight">
          <div className={`dealer-insight__icon dealer-insight__icon--${insight.type}`}>
            {insight.type === 'tip' ? '💡' : insight.type === 'alert' ? '⚠️' : 'ℹ️'}
          </div>
          <div>
            <div className="dealer-insight__title">{insight.title}</div>
            <div className="dealer-insight__desc">{insight.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
});

// Main Dealer Hub layout
export default function DealerHub({ children, user }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => {
    if (path === '/dealer') return location.pathname === '/dealer';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="dealer-hub">
      {/* Header */}
      <header className="dealer-hub__header">
        <div className="dealer-hub__header-inner">
          <div className="dealer-hub__logo">
            <Link to="/dealer" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
              <div className="dealer-hub__logo-icon">🚗</div>
              <span className="dealer-hub__logo-text">KAYAD</span>
              <span className="dealer-hub__logo-badge">Dealer Hub</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="dealer-hub__nav" style={{ display: 'flex' }}>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.id}
                to={item.to}
                className={`dealer-hub__nav-item ${isActive(item.to) ? 'dealer-hub__nav-item--active' : ''}`}
              >
                <item.icon size={16} />
                {item.label}
                {item.badge > 0 && (
                  <span style={{
                    background: 'var(--dealer-gold)',
                    color: '#FFFFFF',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 10,
                  }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <div className="dealer-hub__actions">
            <button className="dealer-leads__action" title="Notifications" style={{ position: 'relative' }}>
              <Bell size={18} />
              <span style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 8,
                height: 8,
                background: '#EF4444',
                borderRadius: '50%',
              }} />
            </button>
            <Link to="/dealer/add-car" className="dealer-btn dealer-btn--primary dealer-btn--sm">
              <Plus size={16} />
              Add Listing
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dealer-hub__content">
        {children}
      </main>
    </div>
  );
}
