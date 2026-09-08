// ============================================================
// KAYAD ENTERPRISE RELIABILITY PLATFORM
// RELIABILITY DASHBOARD
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Server,
  Database,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Shield,
  Gauge,
  RefreshCw,
  HardDrive,
  Wifi,
  Lock,
  BarChart3,
  Settings,
} from 'lucide-react';

const KAYAD_COLORS = {
  lightNavy: '#1e3a5f',
  warmBeige: '#f5f0e8',
  white: '#ffffff',
  emerald: '#10b981',
  mutedTerracotta: '#c4a484',
  softBlue: '#64748b',
  amber: '#f59e0b',
  red: '#ef4444',
  purple: '#8b5cf6',
};

// Sample reliability data
const SLO_STATUS = {
  apiAvailability: { target: 99.95, current: 99.98, status: 'healthy' },
  apiLatency: { target: 200, current: 145, status: 'healthy' },
  errorRate: { target: 0.01, current: 0.02, status: 'healthy' },
  uptime: { target: 99.95, current: 99.97, status: 'healthy' },
};

const SERVICE_HEALTH = [
  { name: 'API Gateway', latency: 45, status: 'healthy', uptime: 99.99 },
  { name: 'Database', latency: 12, status: 'healthy', uptime: 99.99 },
  { name: 'Search', latency: 78, status: 'healthy', uptime: 99.95 },
  { name: 'Cache', latency: 3, status: 'healthy', uptime: 99.99 },
  { name: 'Queue', latency: 5, status: 'healthy', uptime: 99.98 },
  { name: 'Media', latency: 156, status: 'warning', uptime: 99.92 },
  { name: 'Payments', latency: 234, status: 'healthy', uptime: 99.99 },
  { name: 'Notifications', latency: 89, status: 'healthy', uptime: 99.97 },
];

const PERFORMANCE_METRICS = [
  { name: 'API Requests/sec', value: 1245, change: 12.3 },
  { name: 'Active Connections', value: 5678, change: 8.5 },
  { name: 'Cache Hit Rate', value: 94.5, change: 2.1, unit: '%' },
  { name: 'DB Queries/sec', value: 2345, change: 15.2 },
];

const INFRASTRUCTURE_STATUS = {
  cpu: { usage: 45, cores: 16 },
  memory: { usage: 62, total: 32 },
  storage: { usage: 38, total: 500 },
  network: { in: 125, out: 340 },
};

const ALERTS = [
  { id: 1, severity: 'warning', message: 'Search latency elevated (78ms > 50ms target)', time: '5 min ago' },
  { id: 2, severity: 'info', message: 'Cache warming completed for 150 vehicles', time: '10 min ago' },
  { id: 3, severity: 'success', message: 'Database backup completed successfully', time: '1 hour ago' },
];

const BACKGROUND_JOBS = [
  { name: 'Email Queue', pending: 45, processing: 5, failed: 2 },
  { name: 'Image Processing', pending: 23, processing: 8, failed: 0 },
  { name: 'Notifications', pending: 156, processing: 12, failed: 1 },
  { name: 'Search Indexing', pending: 12, processing: 3, failed: 0 },
];

export default function ReliabilityDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'infrastructure' | 'jobs'>('overview');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Activity size={18} /> },
    { id: 'performance', label: 'Performance', icon: <Gauge size={18} /> },
    { id: 'infrastructure', label: 'Infrastructure', icon: <Server size={18} /> },
    { id: 'jobs', label: 'Background Jobs', icon: <RefreshCw size={18} /> },
  ];

  const handleRefresh = () => {
    setLastRefresh(new Date());
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
      {/* Header */}
      <header className="shadow-md" style={{ backgroundColor: KAYAD_COLORS.lightNavy }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <Shield size={32} color={KAYAD_COLORS.white} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Reliability Platform</h1>
                <p className="text-sm opacity-80">Enterprise Performance & Monitoring</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                <CheckCircle size={16} />
                All Systems Operational
              </span>
              <button onClick={handleRefresh} className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <RefreshCw size={20} color={KAYAD_COLORS.white} />
              </button>
              <p className="text-xs text-white opacity-60">Last updated: {lastRefresh.toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                activeTab === tab.id ? 'text-white' : ''
              }`}
              style={{
                backgroundColor: activeTab === tab.id ? KAYAD_COLORS.lightNavy : KAYAD_COLORS.white,
                color: activeTab === tab.id ? KAYAD_COLORS.white : KAYAD_COLORS.lightNavy,
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* SLO Status */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'API Availability', ...SLO_STATUS.apiAvailability, unit: '%', icon: <CheckCircle size={20} /> },
                { label: 'API Latency (P95)', ...SLO_STATUS.apiLatency, unit: 'ms', icon: <Clock size={20} /> },
                { label: 'Error Rate', ...SLO_STATUS.errorRate, unit: '%', icon: <AlertTriangle size={20} /> },
                { label: 'Uptime', ...SLO_STATUS.uptime, unit: '%', icon: <TrendingUp size={20} /> },
              ].map((slo, i) => (
                <motion.div
                  key={slo.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl p-4 shadow-md"
                  style={{ backgroundColor: KAYAD_COLORS.white }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div style={{ color: KAYAD_COLORS.softBlue }}>{slo.icon}</div>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: slo.status === 'healthy' ? `${KAYAD_COLORS.emerald}20` : `${KAYAD_COLORS.amber}20`,
                        color: slo.status === 'healthy' ? KAYAD_COLORS.emerald : KAYAD_COLORS.amber
                      }}
                    >
                      {slo.status}
                    </span>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
                    {slo.current.toFixed(2)}{slo.unit}
                  </p>
                  <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{slo.label}</p>
                  <p className="text-xs mt-1" style={{ color: KAYAD_COLORS.softBlue }}>
                    Target: {slo.target}{slo.unit}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Service Health */}
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Service Health</h3>
              <div className="space-y-3">
                {SERVICE_HEALTH.map((service) => (
                  <div key={service.name} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: service.status === 'healthy' ? KAYAD_COLORS.emerald : KAYAD_COLORS.amber }}
                      />
                      <span style={{ color: KAYAD_COLORS.lightNavy }}>{service.name}</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{service.latency}ms</p>
                        <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>Latency</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium" style={{ color: KAYAD_COLORS.emerald }}>{service.uptime}%</p>
                        <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>Uptime</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alerts */}
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Recent Alerts</h3>
              <div className="space-y-3">
                {ALERTS.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <AlertTriangle
                      size={18}
                      style={{
                        color: alert.severity === 'warning' ? KAYAD_COLORS.amber :
                               alert.severity === 'success' ? KAYAD_COLORS.emerald : KAYAD_COLORS.softBlue,
                        marginTop: 2
                      }}
                    />
                    <div className="flex-1">
                      <p style={{ color: KAYAD_COLORS.lightNavy }}>{alert.message}</p>
                      <p className="text-xs mt-1" style={{ color: KAYAD_COLORS.softBlue }}>{alert.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {PERFORMANCE_METRICS.map((metric, i) => (
                <motion.div
                  key={metric.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl p-4 shadow-md"
                  style={{ backgroundColor: KAYAD_COLORS.white }}
                >
                  <p className="text-sm mb-1" style={{ color: KAYAD_COLORS.softBlue }}>{metric.name}</p>
                  <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
                    {metric.value.toLocaleString()}{metric.unit || ''}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {metric.change >= 0 ? (
                      <TrendingUp size={14} style={{ color: KAYAD_COLORS.emerald }} />
                    ) : (
                      <TrendingDown size={14} style={{ color: KAYAD_COLORS.red }} />
                    )}
                    <span className="text-xs" style={{ color: metric.change >= 0 ? KAYAD_COLORS.emerald : KAYAD_COLORS.red }}>
                      {Math.abs(metric.change)}%
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Performance Charts Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Response Time Trend</h3>
                <div className="h-48 rounded-lg flex items-center justify-center" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                  <p style={{ color: KAYAD_COLORS.softBlue }}>Response time chart (24h)</p>
                </div>
              </div>
              <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Request Volume</h3>
                <div className="h-48 rounded-lg flex items-center justify-center" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                  <p style={{ color: KAYAD_COLORS.softBlue }}>Request volume chart (24h)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Infrastructure Tab */}
        {activeTab === 'infrastructure' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'CPU Usage', value: INFRASTRUCTURE_STATUS.cpu.usage, total: INFRASTRUCTURE_STATUS.cpu.cores },
                { label: 'Memory Usage', value: INFRASTRUCTURE_STATUS.memory.usage, total: INFRASTRUCTURE_STATUS.memory.total },
                { label: 'Storage Usage', value: INFRASTRUCTURE_STATUS.storage.usage, total: INFRASTRUCTURE_STATUS.storage.total },
              ].map((resource) => (
                <div key={resource.label} className="rounded-xl p-4 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                  <p className="text-sm mb-2" style={{ color: KAYAD_COLORS.softBlue }}>{resource.label}</p>
                  <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>{resource.value}%</p>
                  <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${resource.value}%`,
                        backgroundColor: resource.value > 80 ? KAYAD_COLORS.red : resource.value > 60 ? KAYAD_COLORS.amber : KAYAD_COLORS.emerald
                      }}
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: KAYAD_COLORS.softBlue }}>
                    {resource.total}{resource.label.includes('Storage') ? 'GB' : resource.label.includes('Memory') ? 'GB' : 'cores'}
                  </p>
                </div>
              ))}
            </div>

            {/* Network Stats */}
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Network Traffic</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Wifi size={20} style={{ color: KAYAD_COLORS.softBlue }} />
                    <span style={{ color: KAYAD_COLORS.lightNavy }}>Incoming</span>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>{INFRASTRUCTURE_STATUS.network.in} MB/s</p>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Wifi size={20} style={{ color: KAYAD_COLORS.softBlue }} />
                    <span style={{ color: KAYAD_COLORS.lightNavy }}>Outgoing</span>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>{INFRASTRUCTURE_STATUS.network.out} MB/s</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Background Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="space-y-6">
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Background Job Queues</h3>
              <div className="space-y-4">
                {BACKGROUND_JOBS.map((job) => (
                  <div key={job.name} className="p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-3">
                        <RefreshCw size={20} style={{ color: KAYAD_COLORS.softBlue }} />
                        <span className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{job.name}</span>
                      </div>
                      {job.failed > 0 && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: `${KAYAD_COLORS.red}20`, color: KAYAD_COLORS.red }}>
                          {job.failed} failed
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>{job.pending}</p>
                        <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>Pending</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold" style={{ color: KAYAD_COLORS.emerald }}>{job.processing}</p>
                        <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>Processing</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold" style={{ color: KAYAD_COLORS.softBlue }}>{job.pending + job.processing}</p>
                        <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>Total</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
