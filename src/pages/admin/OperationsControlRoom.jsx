import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../api/api';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import {
  Users, Car, DollarSign, AlertTriangle, TrendingUp, TrendingDown,
  Activity, Clock, CheckCircle, XCircle, RefreshCw, Eye, Shield,
  ArrowUpRight, ArrowDownRight, Zap, BarChart3, AlertCircle
} from 'lucide-react';

const METRIC_CARDS = [
  { key: 'totalUsers', label: 'Total Users', icon: Users, color: '#3b82f6' },
  { key: 'totalDealers', label: 'Active Dealers', icon: Shield, color: '#8b5cf6' },
  { key: 'totalCars', label: 'Total Listings', icon: Car, color: '#06b6d4' },
  { key: 'activeEscrows', label: 'Active Escrows', icon: DollarSign, color: '#10b981' },
];

export default function OperationsControlRoom() {
  const socket = useSocket();
  const { toast } = useToast();
  const [metrics, setMetrics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [activity, setActivity] = useState([]);
  const [systemHealth, setSystemHealth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const loadMetrics = useCallback(async () => {
    try {
      const data = await adminAPI.getOperationsMetrics();
      setMetrics(data);
      if (data.alerts) setAlerts(data.alerts);
      if (data.activity) setActivity(data.activity);
      if (data.systemHealth) setSystemHealth(data.systemHealth);
      setLastUpdate(new Date());
    } catch {
      toast('Failed to load operations metrics', 'error');
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Real-time updates via Socket.io
  useEffect(() => {
    if (!socket?.connected) return;

    const handleMetricUpdate = (data) => {
      setMetrics(prev => ({
        ...prev,
        [data.key]: data.value,
        ...data.metrics,
      }));
      setLastUpdate(new Date());
    };

    const handleAlert = (data) => {
      setAlerts(prev => [{ ...data, timestamp: new Date(), id: `alert-${Date.now()}` }, ...prev.slice(0, 19)]);
      if (data.severity === 'critical') {
        toast.error(data.message);
      } else if (data.severity === 'warning') {
        toast.warning(data.message);
      } else {
        toast.info(data.message);
      }
    };

    const handleActivity = (data) => {
      setActivity(prev => [{ ...data, timestamp: new Date(), id: `activity-${Date.now()}` }, ...prev.slice(0, 49)]);
    };

    socket.on('operations:metrics', handleMetricUpdate);
    socket.on('operations:alert', handleAlert);
    socket.on('operations:activity', handleActivity);

    return () => {
      socket.off('operations:metrics', handleMetricUpdate);
      socket.off('operations:alert', handleAlert);
      socket.off('operations:activity', handleActivity);
    };
  }, [socket, toast]);

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatValue = (value) => {
    if (typeof value === 'number') {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
      return value.toLocaleString();
    }
    return value;
  };

  const getAlertColor = (severity) => {
    switch (severity) {
      case 'critical': return { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', icon: XCircle, color: '#ef4444' };
      case 'warning': return { bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.3)', icon: AlertTriangle, color: '#f97316' };
      case 'info': return { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', icon: AlertCircle, color: '#3b82f6' };
      default: return { bg: 'rgba(156, 163, 175, 0.1)', border: 'rgba(156, 163, 175, 0.3)', icon: AlertCircle, color: '#9ca3af' };
    }
  };

  if (loading) {
    return (
      <div className="admin-page loading-center">
        <div className="spinner" />
        <p style={{ marginTop: 16, color: 'var(--text-muted)' }}>Loading operations data...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-header">
        <div>
          <h1 className="admin-title">
            <Activity size={24} />
            Operations Control Room
          </h1>
          <p className="admin-subtitle">
            Real-time monitoring · Last updated: {formatTime(lastUpdate)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="btn btn-outline"
            onClick={loadMetrics}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
          {socket?.connected && (
            <div className="live-indicator">
              <span className="live-dot" /> Live
            </div>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="admin-grid admin-grid--metrics">
        {METRIC_CARDS.map((card) => {
          const Icon = card.icon;
          const value = metrics?.[card.key] ?? 0;
          const trend = metrics?.[`${card.key}Trend`] ?? 0;
          const TrendIcon = trend >= 0 ? TrendingUp : TrendingDown;

          return (
            <div key={card.key} className="admin-card admin-card--metric">
              <div className="metric-header">
                <div className="metric-icon" style={{ background: `${card.color}15`, color: card.color }}>
                  <Icon size={20} />
                </div>
                <div className="metric-trend" style={{ color: trend >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  <TrendIcon size={14} />
                  {Math.abs(trend)}%
                </div>
              </div>
              <div className="metric-value">{formatValue(value)}</div>
              <div className="metric-label">{card.label}</div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="admin-grid admin-grid--main">
        {/* Alerts Panel */}
        <div className="admin-card">
          <div className="card-header">
            <h3 className="card-title">
              <AlertTriangle size={18} />
              Recent Alerts
            </h3>
            <span className="badge">{alerts.length}</span>
          </div>
          <div className="card-body" style={{ maxHeight: 400, overflowY: 'auto' }}>
            {alerts.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <CheckCircle size={32} style={{ color: 'var(--green)', marginBottom: 8 }} />
                <p>No recent alerts</p>
              </div>
            ) : (
              <div className="alerts-list">
                {alerts.map((alert) => {
                  const config = getAlertColor(alert.severity);
                  const Icon = config.icon;
                  return (
                    <div
                      key={alert.id}
                      className="alert-item"
                      style={{ background: config.bg, borderColor: config.border }}
                    >
                      <Icon size={18} style={{ color: config.color, flexShrink: 0 }} />
                      <div className="alert-content">
                        <div className="alert-title">{alert.message}</div>
                        <div className="alert-meta">
                          <span>{alert.category || 'System'}</span>
                          {alert.timestamp && (
                            <span>· {formatTime(alert.timestamp)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="admin-card">
          <div className="card-header">
            <h3 className="card-title">
              <Clock size={18} />
              Live Activity Feed
            </h3>
            <span className="live-indicator" style={{ fontSize: 11 }}>
              <span className="live-dot" /> {activity.length} events
            </span>
          </div>
          <div className="card-body" style={{ maxHeight: 400, overflowY: 'auto' }}>
            {activity.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <Activity size={32} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                <p>Waiting for activity...</p>
              </div>
            ) : (
              <div className="activity-list">
                {activity.slice(0, 20).map((item) => (
                  <div key={item.id} className="activity-item">
                    <div className="activity-icon" style={{ background: `${item.color || '#6b7280'}20` }}>
                      {item.icon || '📌'}
                    </div>
                    <div className="activity-content">
                      <div className="activity-title">{item.message}</div>
                      <div className="activity-meta">
                        <span>{item.source || 'System'}</span>
                        <span>· {formatTime(item.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* System Health */}
        <div className="admin-card">
          <div className="card-header">
            <h3 className="card-title">
              <Zap size={18} />
              System Health
            </h3>
          </div>
          <div className="card-body">
            {systemHealth.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <BarChart3 size={32} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                <p>No system metrics available</p>
              </div>
            ) : (
              <div className="health-list">
                {systemHealth.map((item, i) => (
                  <div key={i} className="health-item">
                    <div className="health-header">
                      <span className="health-label">{item.label}</span>
                      <span
                        className="health-status"
                        style={{ color: item.status === 'healthy' ? 'var(--green)' : item.status === 'warning' ? 'var(--orange)' : 'var(--red)' }}
                      >
                        {item.status === 'healthy' ? '✓' : item.status === 'warning' ? '!' : '✗'}
                      </span>
                    </div>
                    <div className="health-bar">
                      <div
                        className="health-bar-fill"
                        style={{
                          width: `${item.value}%`,
                          background: item.status === 'healthy' ? 'var(--green)' : item.status === 'warning' ? 'var(--orange)' : 'var(--red)',
                        }}
                      />
                    </div>
                    <div className="health-value">{item.value}%</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="admin-grid admin-grid--stats">
        <div className="admin-card">
          <div className="card-header">
            <h3 className="card-title">
              <Eye size={18} />
              Platform Visibility
            </h3>
          </div>
          <div className="card-body">
            <div className="quick-stat">
              <div className="quick-stat-label">Active Users (now)</div>
              <div className="quick-stat-value">{formatValue(metrics?.activeUsers ?? 0)}</div>
            </div>
            <div className="quick-stat">
              <div className="quick-stat-label">Page Views (today)</div>
              <div className="quick-stat-value">{formatValue(metrics?.pageViews ?? 0)}</div>
            </div>
            <div className="quick-stat">
              <div className="quick-stat-label">API Requests (min)</div>
              <div className="quick-stat-value">{formatValue(metrics?.apiRequestsPerMin ?? 0)}</div>
            </div>
          </div>
        </div>

        <div className="admin-card">
          <div className="card-header">
            <h3 className="card-title">
              <Shield size={18} />
              Transaction Security
            </h3>
          </div>
          <div className="card-body">
            <div className="quick-stat">
              <div className="quick-stat-label">Escrow Success Rate</div>
              <div className="quick-stat-value">{metrics?.escrowSuccessRate ?? 0}%</div>
            </div>
            <div className="quick-stat">
              <div className="quick-stat-label">Avg Transaction Time</div>
              <div className="quick-stat-value">{metrics?.avgTransactionTime ?? '0m'}</div>
            </div>
            <div className="quick-stat">
              <div className="quick-stat-label">Disputes (7d)</div>
              <div className="quick-stat-value">{metrics?.disputesLastWeek ?? 0}</div>
            </div>
          </div>
        </div>

        <div className="admin-card">
          <div className="card-header">
            <h3 className="card-title">
              <Users size={18} />
              Dealer Operations
            </h3>
          </div>
          <div className="card-body">
            <div className="quick-stat">
              <div className="quick-stat-label">Pending Approvals</div>
              <div className="quick-stat-value">{metrics?.pendingApprovals ?? 0}</div>
            </div>
            <div className="quick-stat">
              <div className="quick-stat-label">New Listings (today)</div>
              <div className="quick-stat-value">{metrics?.newListingsToday ?? 0}</div>
            </div>
            <div className="quick-stat">
              <div className="quick-stat-label">Support Tickets</div>
              <div className="quick-stat-value">{metrics?.openTickets ?? 0}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
