import React, { useState, useEffect } from 'react';
import {
  Activity, GitBranch, ListChecks, Bell, Clock, Shield,
  Zap, BarChart3, FileText, Settings, ChevronRight, Play,
  Pause, Plus, Eye, Edit, Trash2, Search, Filter, MoreVertical,
  CheckCircle, XCircle, AlertCircle, Timer, Users, Webhook,
  Database, Mail, MessageSquare, BellRing, Calendar, RefreshCw,
  Brain, ArrowUpRight, TrendingUp, ClipboardList, FlaskConical
} from 'lucide-react';
import * as automationApi from '../../../services/automationApi';

// Design System Colors
const colors = {
  navy: '#17244B',
  beige: '#F6F1E8',
  white: '#FFFFFF',
  emerald: '#10B981',
  terracotta: '#C77B58',
  softBlue: '#60A5FA',
  mutedOrange: '#FB923C',
  mutedCrimson: '#EF4444',
};

const modules = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity, color: colors.navy },
  { id: 'workflows', label: 'Workflows', icon: GitBranch, color: colors.softBlue },
  { id: 'rules', label: 'Business Rules', icon: Shield, color: colors.emerald },
  { id: 'approvals', label: 'Approvals', icon: CheckCircle, color: colors.terracotta },
  { id: 'tasks', label: 'Tasks', icon: ListChecks, color: '#8B5CF6' },
  { id: 'notifications', label: 'Notifications', icon: BellRing, color: colors.mutedOrange },
  { id: 'scheduler', label: 'Scheduler', icon: Clock, color: '#06B6D4' },
  { id: 'logs', label: 'Logs', icon: FileText, color: colors.softBlue },
  { id: 'templates', label: 'Templates', icon: FlaskConical, color: '#A855F7' },
  { id: 'ai', label: 'AI Suggestions', icon: Brain, color: '#EC4899' },
  { id: 'settings', label: 'Settings', icon: Settings, color: colors.navy },
];

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-amber-100 text-amber-700',
  draft: 'bg-slate-100 text-slate-700',
  failed: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
};

export default function AutomationStudio() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [rules, setRules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const { data } = await automationApi.getAutomationStats();
      setStats(data.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
      // No synthetic production fallback: the dashboard remains empty until the backend responds.
    } finally {
      setLoading(false);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Automation Overview</h2>
        <button
          onClick={() => setActiveModule('workflows')}
          className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054] transition-colors"
        >
          <Plus size={18} />
          Create Workflow
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Workflows', value: stats?.workflows?.active || 0, sub: `${stats?.workflows?.total || 0} total`, icon: GitBranch, color: colors.softBlue },
          { label: 'Pending Tasks', value: stats?.tasks?.pending || 0, sub: `${stats?.tasks?.overdue || 0} overdue`, icon: ListChecks, color: colors.terracotta },
          { label: 'Active Rules', value: stats?.rules?.active || 0, sub: `${stats?.rules?.total || 0} configured`, icon: Shield, color: colors.emerald },
          { label: 'Executions Today', value: stats?.executions?.total || 0, sub: `${Math.round((stats?.executions?.successful || 0) / (stats?.executions?.total || 1) * 100)}% success`, icon: Activity, color: colors.navy },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}20` }}>
                <stat.icon size={20} style={{ color: stat.color }} />
              </div>
              <span className="text-sm text-slate-500">{stat.label}</span>
            </div>
            <div className="text-3xl font-bold text-slate-800">{stat.value.toLocaleString()}</div>
            <div className="text-xs text-slate-400 mt-1">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Performance & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Executions */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Recent Executions</h3>
            <button
              onClick={() => setActiveModule('logs')}
              className="text-sm text-[#17244B] hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {[
              { name: 'Dealer Verification', status: 'success', time: '2 min ago', duration: '1.2s' },
              { name: 'Auction Reminder', status: 'success', time: '5 min ago', duration: '0.8s' },
              { name: 'Vehicle Expiry Check', status: 'success', time: '12 min ago', duration: '2.1s' },
              { name: 'Finance Approval', status: 'failed', time: '18 min ago', duration: '0.3s' },
              { name: 'Subscription Renewal', status: 'success', time: '25 min ago', duration: '1.5s' },
            ].map((exec, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${exec.status === 'success' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    {exec.status === 'success' ? <CheckCircle size={16} className="text-emerald-600" /> : <XCircle size={16} className="text-red-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{exec.name}</p>
                    <p className="text-xs text-slate-400">{exec.time}</p>
                  </div>
                </div>
                <span className="text-xs text-slate-500">{exec.duration}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Task Queue */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Task Queue</h3>
            <button
              onClick={() => setActiveModule('tasks')}
              className="text-sm text-[#17244B] hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {[
              { title: 'Review Dealer Documents', priority: 'high', assignee: 'Moderator', due: '1 hour' },
              { title: 'Approve Auction Listing', priority: 'medium', assignee: 'Admin', due: '2 hours' },
              { title: 'Verify Bank Partnership', priority: 'medium', assignee: 'Admin', due: '3 hours' },
              { title: 'Process Refund Request', priority: 'low', assignee: 'Support', due: '5 hours' },
              { title: 'Update Vehicle Details', priority: 'low', assignee: 'Editor', due: '1 day' },
            ].map((task, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{task.title}</p>
                    <p className="text-xs text-slate-400">{task.assignee}</p>
                  </div>
                </div>
                <span className="text-xs text-slate-500">{task.due}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Suggestions */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
              <Brain size={20} className="text-pink-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">AI Automation Suggestions</h3>
              <p className="text-sm text-slate-500">Recommendations based on platform patterns</p>
            </div>
          </div>
          <button className="text-sm text-[#17244B] hover:underline flex items-center gap-1">
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'Automate Dealer Verification', desc: '47 pending verifications detected', impact: '+2.5 hrs/day' },
            { title: 'Auction Approval Bottleneck', desc: 'Avg 4.2 hours approval time', impact: '+3 hrs/day' },
            { title: 'Vehicle Expiry Reminders', desc: '60% lower engagement on stale listings', impact: '+1 hr/day' },
          ].map((sug, i) => (
            <div key={i} className="p-4 rounded-lg border border-slate-200 hover:border-[#17244B] transition-colors cursor-pointer">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-slate-800">{sug.title}</h4>
                <ArrowUpRight size={16} className="text-slate-400" />
              </div>
              <p className="text-sm text-slate-500 mb-3">{sug.desc}</p>
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-emerald-600" />
                <span className="text-sm font-medium text-emerald-600">{sug.impact}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderWorkflows = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Workflows</h2>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
            <FlaskConical size={18} />
            Use Template
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]">
            <Plus size={18} />
            Create Workflow
          </button>
        </div>
      </div>

      {/* Workflow Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { name: 'Dealer Onboarding', category: 'onboarding', status: 'active', runs: 234, success: 98 },
          { name: 'Auction Setup', category: 'auctions', status: 'active', runs: 156, success: 99 },
          { name: 'Complaint Handling', category: 'support', status: 'paused', runs: 89, success: 95 },
          { name: 'Vehicle Publishing', category: 'marketplace', status: 'active', runs: 412, success: 97 },
          { name: 'Subscription Renewal', category: 'billing', status: 'draft', runs: 0, success: 0 },
          { name: 'Finance Approval', category: 'finance', status: 'active', runs: 78, success: 96 },
        ].map((workflow, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:border-[#17244B] transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <GitBranch size={20} className="text-slate-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{workflow.name}</h3>
                  <p className="text-xs text-slate-400 capitalize">{workflow.category}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[workflow.status]}`}>
                {workflow.status}
              </span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span>{workflow.runs} runs</span>
                {workflow.success > 0 && <span className="text-emerald-600">{workflow.success}% success</span>}
              </div>
              <div className="flex items-center gap-1">
                {workflow.status === 'active' ? (
                  <button className="p-2 hover:bg-slate-100 rounded-lg" title="Pause">
                    <Pause size={16} className="text-slate-500" />
                  </button>
                ) : workflow.status === 'paused' ? (
                  <button className="p-2 hover:bg-slate-100 rounded-lg" title="Resume">
                    <Play size={16} className="text-slate-500" />
                  </button>
                ) : null}
                <button className="p-2 hover:bg-slate-100 rounded-lg" title="Edit">
                  <Edit size={16} className="text-slate-500" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTasks = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Automation Tasks</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]">
          <Plus size={18} />
          Create Task
        </button>
      </div>

      {/* Task Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-[#17244B] focus:ring-2 focus:ring-[#17244B]/20 outline-none"
          />
        </div>
        <select className="px-4 py-2.5 rounded-lg border border-slate-200 focus:border-[#17244B] outline-none">
          <option>All Status</option>
          <option>Pending</option>
          <option>In Progress</option>
          <option>Completed</option>
        </select>
        <select className="px-4 py-2.5 rounded-lg border border-slate-200 focus:border-[#17244B] outline-none">
          <option>All Priority</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Task</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Priority</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Assignee</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Due</th>
              <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[
              { title: 'Review Dealer Documents', type: 'approval', priority: 'high', status: 'pending', assignee: 'Moderator', due: '1 hour' },
              { title: 'Approve Auction Listing', type: 'approval', priority: 'medium', status: 'in_progress', assignee: 'Admin', due: '2 hours' },
              { title: 'Verify Bank Partnership', type: 'verification', priority: 'medium', status: 'pending', assignee: 'Admin', due: '3 hours' },
              { title: 'Process Refund Request', type: 'refund', priority: 'low', status: 'pending', assignee: 'Support', due: '5 hours' },
              { title: 'Investigate Fraud Alert', type: 'security', priority: 'high', status: 'in_progress', assignee: 'Security', due: '30 min' },
            ].map((task, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-slate-800">{task.title}</p>
                    <p className="text-xs text-slate-400 capitalize">{task.type}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    task.priority === 'high' ? 'bg-red-100 text-red-700' :
                    task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {task.priority}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[task.status]}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#C77B58]/20 text-[#C77B58] text-xs font-medium flex items-center justify-center">
                      {task.assignee[0]}
                    </div>
                    <span className="text-sm text-slate-600">{task.assignee}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{task.due}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {task.status === 'pending' && (
                      <button className="px-3 py-1 text-xs bg-[#17244B] text-white rounded hover:bg-[#1e3054]">
                        Start
                      </button>
                    )}
                    {task.status === 'in_progress' && (
                      <button className="px-3 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700">
                        Complete
                      </button>
                    )}
                    <button className="p-2 hover:bg-slate-100 rounded-lg">
                      <MoreVertical size={16} className="text-slate-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderRules = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Business Rules</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]">
          <Plus size={18} />
          Create Rule
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { name: 'Low Dealer Rating', condition: 'Dealer Rating < 3', action: 'Suspend new listings', status: 'active', executions: 45 },
          { name: 'Auction Deposit Verified', condition: 'Deposit = Verified', action: 'Issue Bidder Pass', status: 'active', executions: 234 },
          { name: 'Low Inspection Score', condition: 'Score < Minimum', action: 'Hide listing', status: 'active', executions: 12 },
          { name: 'Subscription Expired', condition: 'Days Since Payment > 30', action: 'Disable premium features', status: 'active', executions: 89 },
          { name: 'Vehicle Sold', condition: 'Status = Sold', action: 'Archive listing', status: 'active', executions: 567 },
          { name: 'Payment Failed', condition: 'Payment Status = Failed', action: 'Notify seller', status: 'paused', executions: 23 },
        ].map((rule, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-800">{rule.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium mt-1 inline-block ${statusColors[rule.status]}`}>
                  {rule.status}
                </span>
              </div>
              <span className="text-sm text-slate-500">{rule.executions} executions</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-slate-400 font-medium">IF</span>
                <span className="text-slate-600">{rule.condition}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-slate-400 font-medium">THEN</span>
                <span className="text-slate-600">{rule.action}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
              <button className="p-2 hover:bg-slate-100 rounded-lg">
                <Edit size={16} className="text-slate-500" />
              </button>
              <button className="p-2 hover:bg-slate-100 rounded-lg">
                {rule.status === 'active' ? <Pause size={16} className="text-slate-500" /> : <Play size={16} className="text-slate-500" />}
              </button>
              <button className="p-2 hover:bg-red-50 rounded-lg">
                <Trash2 size={16} className="text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Notification Templates</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]">
          <Plus size={18} />
          Create Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { name: 'Auction Reminder', type: 'email', channel: 'Email + SMS', usage: 1234 },
          { name: 'Inspection Reminder', type: 'sms', channel: 'SMS', usage: 567 },
          { name: 'Finance Approval', type: 'email', channel: 'Email', usage: 234 },
          { name: 'Dealer Verification', type: 'email', channel: 'Email + Push', usage: 456 },
          { name: 'Subscription Reminder', type: 'email', channel: 'Email', usage: 890 },
          { name: 'Vehicle Expiry', type: 'push', channel: 'Push Notification', usage: 321 },
        ].map((template, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Mail size={20} className="text-slate-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">{template.name}</h3>
                <p className="text-xs text-slate-400">{template.channel}</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-sm text-slate-500">{template.usage} sent</span>
              <div className="flex items-center gap-1">
                <button className="p-2 hover:bg-slate-100 rounded-lg">
                  <Eye size={16} className="text-slate-500" />
                </button>
                <button className="p-2 hover:bg-slate-100 rounded-lg">
                  <Edit size={16} className="text-slate-500" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderScheduler = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Scheduled Jobs</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]">
          <Plus size={18} />
          Create Scheduled Job
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Job</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Schedule</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Last Run</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Next Run</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[
              { name: 'Archive Expired Listings', schedule: 'Daily 2:00 AM', lastRun: '2 hours ago', nextRun: '14 hours', status: 'active' },
              { name: 'Dealer Score Update', schedule: 'Weekly Monday', lastRun: '2 days ago', nextRun: '5 days', status: 'active' },
              { name: 'Market Statistics', schedule: 'Daily 6:00 AM', lastRun: '8 hours ago', nextRun: '10 hours', status: 'active' },
              { name: 'Commission Reports', schedule: 'Monthly 1st', lastRun: '29 days ago', nextRun: '1 day', status: 'active' },
              { name: 'Inspection Metrics', schedule: 'Daily 8:00 AM', lastRun: '6 hours ago', nextRun: '12 hours', status: 'paused' },
            ].map((job, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Clock size={16} className="text-slate-500" />
                    </div>
                    <span className="font-medium text-slate-800">{job.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{job.schedule}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{job.lastRun}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{job.nextRun}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[job.status]}`}>
                    {job.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="px-3 py-1 text-xs border border-slate-200 rounded hover:bg-slate-50">
                      Run Now
                    </button>
                    <button className="p-2 hover:bg-slate-100 rounded-lg">
                      <Edit size={16} className="text-slate-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'dashboard': return renderDashboard();
      case 'workflows': return renderWorkflows();
      case 'tasks': return renderTasks();
      case 'rules': return renderRules();
      case 'notifications': return renderNotifications();
      case 'scheduler': return renderScheduler();
      default: return (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-100 text-center">
          <Activity size={64} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-semibold text-slate-800 mb-2">{modules.find(m => m.id === activeModule)?.label}</h3>
          <p className="text-slate-500">This module is under development</p>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F1E8]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#17244B] flex items-center justify-center">
                  <Zap size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-800">Automation Studio</h1>
                  <p className="text-xs text-slate-500">Workflow & Business Rules</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-slate-100 rounded-lg">
                <Bell size={20} className="text-slate-500" />
              </button>
              <button className="p-2 hover:bg-slate-100 rounded-lg">
                <Settings size={20} className="text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-73px)] sticky top-[73px] overflow-y-auto">
          <nav className="p-4 space-y-1">
            {modules.map((module) => {
              const Icon = module.icon;
              const isActive = activeModule === module.id;
              return (
                <button
                  key={module.id}
                  onClick={() => setActiveModule(module.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#17244B] text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{module.label}</span>
                  {isActive && <ChevronRight size={16} className="ml-auto" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {renderModuleContent()}
        </main>
      </div>
    </div>
  );
}
