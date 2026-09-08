// ============================================================
// KAYAD WORKFLOW ORCHESTRATION ENGINE
// UNIFIED PLATFORM DASHBOARD
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Workflow,
  Layers,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  Car,
  ClipboardCheck,
  Gavel,
  DollarSign,
  Shield,
  FileText,
  MessageSquare,
  Bell,
  Search,
  TrendingUp,
  Activity,
  Play,
  Pause,
  SkipForward,
  ChevronRight,
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
  orange: '#ea580c',
};

// Sample orchestration data
const ORCHESTRATION_DATA = {
  activeWorkflows: 156,
  completedToday: 89,
  healthScore: 94,
  totalVehicles: 2847,
  activeListings: 1234,
  pendingInspections: 45,
  activeAuctions: 12,
  trustScore: 87,
};

const ACTIVE_WORKFLOWS = [
  { id: 1, type: 'buyer', code: 'KAYAD-WF-A1B2C3', currentStep: 'book_inspection', vehicle: 'Toyota Land Cruiser 2020', initiator: 'John K.', startedAt: '2h ago', status: 'active' },
  { id: 2, type: 'inspection', code: 'KAYAD-WF-D4E5F6', currentStep: 'evidence_collection', vehicle: 'Mercedes C-Class 2021', initiator: 'Premium Auto', startedAt: '1h ago', status: 'active' },
  { id: 3, type: 'auction', code: 'KAYAD-WF-G7H8I9', currentStep: 'auction_broadcast', vehicle: 'BMW X5 2022', initiator: 'COA Auctions', startedAt: '30m ago', status: 'active' },
  { id: 4, type: 'ownership', code: 'KAYAD-WF-J1K2L3', currentStep: 'ownership_transfer', vehicle: 'Nissan Patrol 2019', initiator: 'Auto Motors', startedAt: '45m ago', status: 'active' },
];

const JOURNEY_STATS = {
  buyer: { started: 456, completed: 389, conversion: 85 },
  seller: { started: 234, completed: 198, conversion: 84 },
  dealer: { started: 89, completed: 76, conversion: 85 },
  inspection: { started: 312, completed: 298, conversion: 95 },
  auction: { started: 67, completed: 58, conversion: 86 },
};

const MODULES = [
  { id: 'marketplace', name: 'Marketplace', icon: <Car size={24} />, status: 'active', metrics: { listings: 1234, views: 45678 } },
  { id: 'dealer', name: 'Dealer Network', icon: <Users size={24} />, status: 'active', metrics: { dealers: 89, inventory: 2456 } },
  { id: 'inspection', name: 'Inspection', icon: <ClipboardCheck size={24} />, status: 'active', metrics: { completed: 456, pending: 45 } },
  { id: 'auction', name: 'Auction', icon: <Gavel size={24} />, status: 'active', metrics: { active: 12, total: 234 } },
  { id: 'escrow', name: 'Escrow', icon: <DollarSign size={24} />, status: 'active', metrics: { transactions: 345, volume: 'KSh 456M' } },
  { id: 'trust', name: 'Trust Center', icon: <Shield size={24} />, status: 'active', metrics: { verified: 1234, alerts: 12 } },
  { id: 'passport', name: 'Vehicle Passport', icon: <FileText size={24} />, status: 'active', metrics: { passports: 5678, updates: 234 } },
];

const RECENT_ACTIVITY = [
  { id: 1, type: 'workflow', action: 'Inspection workflow completed', entity: 'Toyota Corolla 2021', time: '5 min ago', icon: <CheckCircle size={16} /> },
  { id: 2, type: 'sync', action: 'Vehicle status synchronized', entity: 'VIN: JTMCVREV0LD123456', time: '12 min ago', icon: <Layers size={16} /> },
  { id: 3, type: 'document', action: 'Document flow initiated', entity: 'Inspection Report', time: '18 min ago', icon: <FileText size={16} /> },
  { id: 4, type: 'notification', action: 'Workflow notification sent', entity: 'Buyer: Sarah M.', time: '25 min ago', icon: <Bell size={16} /> },
  { id: 5, type: 'journey', action: 'Buyer journey converted', entity: 'Purchase completed', time: '32 min ago', icon: <ArrowRight size={16} /> },
];

export default function WorkflowOrchestrationDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'workflows' | 'journeys' | 'modules'>('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Layers size={18} /> },
    { id: 'workflows', label: 'Workflows', icon: <Workflow size={18} />, badge: ORCHESTRATION_DATA.activeWorkflows },
    { id: 'journeys', label: 'Journeys', icon: <ArrowRight size={18} /> },
    { id: 'modules', label: 'Modules', icon: <Activity size={18} /> },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
      {/* Header */}
      <header className="shadow-md" style={{ backgroundColor: KAYAD_COLORS.lightNavy }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <Workflow size={32} color={KAYAD_COLORS.white} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Workflow Orchestration Engine</h1>
                <p className="text-sm opacity-80">Unified Automotive Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                Health: {ORCHESTRATION_DATA.healthScore}%
              </span>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Live Orchestration
              </span>
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
              {tab.badge && (
                <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : KAYAD_COLORS.amber, color: KAYAD_COLORS.white }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                icon={<Workflow size={24} />}
                label="Active Workflows"
                value={ORCHESTRATION_DATA.activeWorkflows.toString()}
                subValue={`${ORCHESTRATION_DATA.completedToday} completed today`}
              />
              <MetricCard
                icon={<Car size={24} />}
                label="Total Vehicles"
                value={ORCHESTRATION_DATA.totalVehicles.toLocaleString()}
                subValue={`${ORCHESTRATION_DATA.activeListings} active listings`}
              />
              <MetricCard
                icon={<ClipboardCheck size={24} />}
                label="Inspections"
                value={ORCHESTRATION_DATA.pendingInspections.toString()}
                subValue="pending"
                alert={ORCHESTRATION_DATA.pendingInspections > 40}
              />
              <MetricCard
                icon={<Gavel size={24} />}
                label="Active Auctions"
                value={ORCHESTRATION_DATA.activeAuctions.toString()}
                subValue="live now"
              />
            </div>

            {/* Module Status Grid */}
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Module Integration Status</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {MODULES.map((module, index) => (
                  <motion.div
                    key={module.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-lg border-2 cursor-pointer hover:shadow-md transition-shadow"
                    style={{ borderColor: module.status === 'active' ? KAYAD_COLORS.emerald : KAYAD_COLORS.amber }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${KAYAD_COLORS.lightNavy}15` }}>
                        {module.icon}
                      </div>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: module.status === 'active' ? KAYAD_COLORS.emerald : KAYAD_COLORS.amber }} />
                    </div>
                    <h4 className="font-medium mb-2" style={{ color: KAYAD_COLORS.lightNavy }}>{module.name}</h4>
                    <div className="text-xs space-y-1" style={{ color: KAYAD_COLORS.softBlue }}>
                      {Object.entries(module.metrics).slice(0, 2).map(([key, value]) => (
                        <p key={key}>{key.replace('_', ' ')}: {String(value)}</p>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Journey Funnel & Active Workflows */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Journey Funnel */}
              <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Journey Conversion</h3>
                <div className="space-y-4">
                  {Object.entries(JOURNEY_STATS).map(([type, stats]) => (
                    <div key={type} className="flex items-center gap-4">
                      <div className="w-20 text-sm capitalize" style={{ color: KAYAD_COLORS.softBlue }}>{type}</div>
                      <div className="flex-1">
                        <div className="h-6 rounded-full overflow-hidden flex" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                          <div
                            className="h-full rounded-full flex items-center justify-end pr-2"
                            style={{ width: `${stats.conversion}%`, backgroundColor: KAYAD_COLORS.emerald }}
                          >
                            <span className="text-xs font-medium text-white">{stats.conversion}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                        {stats.completed}/{stats.started}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Workflows */}
              <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>Active Workflows</h3>
                  <span className="text-sm px-2 py-1 rounded" style={{ backgroundColor: `${KAYAD_COLORS.emerald}20`, color: KAYAD_COLORS.emerald }}>
                    {ACTIVE_WORKFLOWS.length} Active
                  </span>
                </div>
                <div className="space-y-3">
                  {ACTIVE_WORKFLOWS.slice(0, 4).map((workflow, index) => (
                    <motion.div
                      key={workflow.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-3 rounded-lg flex items-center justify-between"
                      style={{ backgroundColor: KAYAD_COLORS.warmBeige }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${KAYAD_COLORS.lightNavy}20` }}>
                          <Workflow size={16} style={{ color: KAYAD_COLORS.lightNavy }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{workflow.vehicle}</p>
                          <p className="text-xs capitalize" style={{ color: KAYAD_COLORS.softBlue }}>{workflow.type} Journey</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{workflow.startedAt}</p>
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: KAYAD_COLORS.emerald }} />
                          <span className="text-xs" style={{ color: KAYAD_COLORS.emerald }}>{workflow.currentStep.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Recent Orchestration Activity</h3>
              <div className="space-y-3">
                {RECENT_ACTIVITY.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4 py-2 border-b last:border-0"
                    style={{ borderColor: KAYAD_COLORS.warmBeige }}
                  >
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${KAYAD_COLORS.emerald}15`, color: KAYAD_COLORS.emerald }}>
                      {activity.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm" style={{ color: KAYAD_COLORS.lightNavy }}>{activity.action}</p>
                      <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{activity.entity}</p>
                    </div>
                    <span className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{activity.time}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Workflows Tab */}
        {activeTab === 'workflows' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Workflow Instances</h2>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-lg flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.white, color: KAYAD_COLORS.lightNavy }}>
                  <Search size={18} />
                  Search
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {ACTIVE_WORKFLOWS.map((workflow, index) => (
                <motion.div
                  key={workflow.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="rounded-xl p-6 shadow-md"
                  style={{ backgroundColor: KAYAD_COLORS.white }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 rounded-full text-xs font-medium capitalize" style={{ backgroundColor: `${KAYAD_COLORS.lightNavy}15`, color: KAYAD_COLORS.lightNavy }}>
                          {workflow.type}
                        </span>
                        <span className="text-sm font-mono" style={{ color: KAYAD_COLORS.softBlue }}>{workflow.code}</span>
                      </div>
                      <h3 className="font-semibold text-lg" style={{ color: KAYAD_COLORS.lightNavy }}>{workflow.vehicle}</h3>
                      <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Started by {workflow.initiator} • {workflow.startedAt}</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="p-2 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                        <Pause size={18} style={{ color: KAYAD_COLORS.lightNavy }} />
                      </button>
                      <button className="p-2 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                        <SkipForward size={18} style={{ color: KAYAD_COLORS.lightNavy }} />
                      </button>
                      <button className="p-2 rounded-lg" style={{ backgroundColor: `${KAYAD_COLORS.emerald}15` }}>
                        <ChevronRight size={18} style={{ color: KAYAD_COLORS.emerald }} />
                      </button>
                    </div>
                  </div>

                  {/* Workflow Progress */}
                  <div className="relative">
                    <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2" style={{ backgroundColor: KAYAD_COLORS.warmBeige }} />
                    <div className="relative flex justify-between">
                      {['start', 'search', 'view', 'inspect', 'finance', 'reserve', 'purchase', 'complete'].map((step, i) => {
                        const isActive = step === workflow.currentStep.split('_')[0];
                        const isCompleted = ['start', 'search', 'view', 'inspect'].includes(workflow.currentStep.split('_')[0]) && i < 4;
                        return (
                          <div key={step} className="flex flex-col items-center">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center z-10"
                              style={{
                                backgroundColor: isCompleted ? KAYAD_COLORS.emerald : isActive ? KAYAD_COLORS.lightNavy : KAYAD_COLORS.warmBeige,
                                color: isCompleted || isActive ? KAYAD_COLORS.white : KAYAD_COLORS.softBlue,
                              }}
                            >
                              {isCompleted ? <CheckCircle size={16} /> : <span className="text-xs">{i + 1}</span>}
                            </div>
                            <span className="text-xs mt-1 capitalize" style={{ color: KAYAD_COLORS.softBlue }}>{step}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Journeys Tab */}
        {activeTab === 'journeys' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>User Journey Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(JOURNEY_STATS).map(([type, stats]) => (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl p-6 shadow-md"
                  style={{ backgroundColor: KAYAD_COLORS.white }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: `${KAYAD_COLORS.lightNavy}15` }}>
                      <ArrowRight size={24} style={{ color: KAYAD_COLORS.lightNavy }} />
                    </div>
                    <h3 className="font-semibold capitalize" style={{ color: KAYAD_COLORS.lightNavy }}>{type} Journey</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Started</span>
                      <span className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{stats.started}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Completed</span>
                      <span className="font-semibold" style={{ color: KAYAD_COLORS.emerald }}>{stats.completed}</span>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Conversion Rate</span>
                        <span className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{stats.conversion}%</span>
                      </div>
                      <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${stats.conversion}%`, backgroundColor: KAYAD_COLORS.emerald }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Modules Tab */}
        {activeTab === 'modules' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Connected Modules</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {MODULES.map((module, index) => (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-xl p-6 shadow-md"
                  style={{ backgroundColor: KAYAD_COLORS.white }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg" style={{ backgroundColor: `${KAYAD_COLORS.lightNavy}15` }}>
                        {module.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{module.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: KAYAD_COLORS.emerald }} />
                          <span className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>Connected</span>
                        </div>
                      </div>
                    </div>
                    <button className="px-3 py-1 rounded-lg text-sm font-medium" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
                      Configure
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(module.metrics).map(([key, value]) => (
                      <div key={key} className="p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                        <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>{String(value)}</p>
                        <p className="text-xs capitalize" style={{ color: KAYAD_COLORS.softBlue }}>{key.replace('_', ' ')}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Metric Card Component
function MetricCard({ icon, label, value, subValue, alert }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  alert?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-xl p-4 shadow-md"
      style={{ backgroundColor: KAYAD_COLORS.white }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: alert ? `${KAYAD_COLORS.amber}20` : `${KAYAD_COLORS.softBlue}15` }}
        >
          {icon}
        </div>
        {alert && (
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: KAYAD_COLORS.amber }} />
        )}
      </div>
      <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>{value}</p>
      <div className="flex justify-between items-center mt-1">
        <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{label}</span>
        {subValue && (
          <span className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{subValue}</span>
        )}
      </div>
    </motion.div>
  );
}
