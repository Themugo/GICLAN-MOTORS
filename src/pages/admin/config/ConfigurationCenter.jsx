import React, { useState, useEffect } from 'react';
import {
  Settings, Database, Globe, Car, Users, Gavel, ShieldCheck,
  DollarSign, CreditCard, FileText, Flag, Bell, Tag, Languages,
  MapPin, Zap, Package, Building2, Scale, Truck, CheckCircle,
  ChevronRight, Search, Filter, Plus, Edit, Trash2, Download,
  Upload, MoreVertical, ToggleLeft, ToggleRight, RefreshCw, X,
  Save, Eye, History, AlertTriangle
} from 'lucide-react';
import * as configApi from '../../../services/configApi';

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

const sections = [
  { id: 'dashboard', label: 'Dashboard', icon: Settings, color: colors.navy },
  { id: 'general', label: 'General Settings', icon: Settings, color: colors.navy },
  { id: 'vehicle', label: 'Vehicle Master Data', icon: Car, color: colors.terracotta },
  { id: 'location', label: 'Location Data', icon: MapPin, color: colors.emerald },
  { id: 'reference', label: 'Reference Data', icon: Database, color: colors.softBlue },
  { id: 'features', label: 'Feature Flags', icon: Flag, color: '#8B5CF6' },
  { id: 'dealer', label: 'Dealer Settings', icon: Users, color: colors.terracotta },
  { id: 'auction', label: 'Auction Settings', icon: Gavel, color: colors.navy },
  { id: 'inspection', label: 'Inspection Settings', icon: ShieldCheck, color: colors.emerald },
  { id: 'finance', label: 'Finance Settings', icon: DollarSign, color: colors.softBlue },
  { id: 'payment', label: 'Payment Settings', icon: CreditCard, color: colors.mutedOrange },
  { id: 'pricing', label: 'Pricing Engine', icon: Tag, color: '#EC4899' },
  { id: 'countries', label: 'Countries', icon: Globe, color: colors.navy },
  { id: 'notifications', label: 'Notification Templates', icon: Bell, color: colors.mutedOrange },
  { id: 'audit', label: 'Audit Log', icon: History, color: colors.softBlue },
];

export default function ConfigurationCenter() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [featureFlags, setFeatureFlags] = useState([]);
  const [vehicleData, setVehicleData] = useState([]);
  const [referenceData, setReferenceData] = useState([]);
  const [locationData, setLocationData] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const { data } = await configApi.getConfigStats();
      setStats(data.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
      setStats({
        configEntries: { total: 156 },
        featureFlags: { total: 24, active: 18, inactive: 6 },
        referenceData: { total: 342, byType: { vehicle_status: 8, listing_status: 6 } },
        vehicleMasterData: { total: 567, makes: 45, models: 234, bodyTypes: 15 },
        locationMasterData: { total: 234, countries: 6, regions: 47, cities: 181 },
        countries: { total: 6 },
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFeatureFlag = async (id) => {
    try {
      await configApi.toggleFeatureFlag(id);
      setFeatureFlags(featureFlags.map(f =>
        f.id === id ? { ...f, status: f.status === 'active' ? 'inactive' : 'active' } : f
      ));
    } catch (error) {
      console.error('Failed to toggle feature:', error);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Configuration Overview</h2>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
            <Download size={18} />
            Export
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
            <Upload size={18} />
            Import
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Feature Flags', value: stats?.featureFlags?.total || 0, sub: `${stats?.featureFlags?.active || 0} active`, icon: Flag, color: '#8B5CF6' },
          { label: 'Reference Data', value: stats?.referenceData?.total || 0, sub: 'lookup values', icon: Database, color: colors.softBlue },
          { label: 'Vehicle Data', value: stats?.vehicleMasterData?.total || 0, sub: `${stats?.vehicleMasterData?.makes || 0} makes`, icon: Car, color: colors.terracotta },
          { label: 'Locations', value: stats?.locationMasterData?.total || 0, sub: `${stats?.locationMasterData?.countries || 0} countries`, icon: MapPin, color: colors.emerald },
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

      {/* Quick Access */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Quick Access</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {sections.slice(1, 9).map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-[#17244B] hover:bg-[#17244B]/5 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${section.color}15` }}>
                <section.icon size={20} style={{ color: section.color }} />
              </div>
              <span className="text-sm font-medium text-slate-700">{section.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Recent Changes</h3>
          <button
            onClick={() => setActiveSection('audit')}
            className="text-sm text-[#17244B] hover:underline"
          >
            View All
          </button>
        </div>
        <div className="space-y-3">
          {[
            { action: 'Updated', item: 'Auction Duration Settings', user: 'Admin', time: '5 min ago' },
            { action: 'Created', item: 'New Vehicle Make: BYD', user: 'Editor', time: '1 hour ago' },
            { action: 'Enabled', item: 'AI Assistant Feature', user: 'Admin', time: '2 hours ago' },
            { action: 'Updated', item: 'M-Pesa Configuration', user: 'Admin', time: '3 hours ago' },
            { action: 'Created', item: 'New Region: Nakuru', user: 'Editor', time: '5 hours ago' },
          ].map((log, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  log.action === 'Created' ? 'bg-emerald-100' : log.action === 'Enabled' ? 'bg-blue-100' : 'bg-amber-100'
                }`}>
                  {log.action === 'Created' ? <Plus size={16} className="text-emerald-600" /> :
                   log.action === 'Enabled' ? <CheckCircle size={16} className="text-blue-600" /> :
                   <Edit size={16} className="text-amber-600" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{log.item}</p>
                  <p className="text-xs text-slate-400">by {log.user}</p>
                </div>
              </div>
              <span className="text-xs text-slate-400">{log.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderFeatureFlags = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Feature Flags</h2>
        <button
          onClick={() => { setSelectedItem(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]"
        >
          <Plus size={18} />
          Add Feature Flag
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-[#17244B] outline-none"
          />
        </div>
        <select className="px-4 py-2.5 rounded-lg border border-slate-200 outline-none">
          <option>All Categories</option>
          <option>Marketplace</option>
          <option>Auction</option>
          <option>Finance</option>
          <option>Experimental</option>
        </select>
        <select className="px-4 py-2.5 rounded-lg border border-slate-200 outline-none">
          <option>All Status</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
      </div>

      {/* Feature Flags Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { key: 'auctions_enabled', name: 'Auctions', category: 'Marketplace', status: 'active', description: 'Enable auction functionality' },
          { key: 'escrow_enabled', name: 'Escrow', category: 'Finance', status: 'active', description: 'Enable escrow payments' },
          { key: 'finance_enabled', name: 'Finance', category: 'Finance', status: 'active', description: 'Enable financing options' },
          { key: 'messaging_enabled', name: 'Messaging', category: 'Communication', status: 'active', description: 'Enable in-app messaging' },
          { key: 'ai_assistant', name: 'AI Assistant', category: 'Experimental', status: 'inactive', description: 'Enable AI-powered assistant' },
          { key: 'live_video', name: 'Live Video Tours', category: 'Experimental', status: 'inactive', description: 'Enable live video vehicle tours' },
          { key: 'voice_commentary', name: 'Voice Commentary', category: 'Experimental', status: 'inactive', description: 'Enable voice notes on listings' },
          { key: 'dealer_analytics', name: 'Dealer Analytics', category: 'Analytics', status: 'active', description: 'Enable dealer dashboard analytics' },
          { key: 'vehicle_passport', name: 'Vehicle Passport', category: 'Marketplace', status: 'active', description: 'Enable vehicle passport feature' },
        ].map((flag, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${flag.status === 'active' ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                  <Zap size={20} className={flag.status === 'active' ? 'text-emerald-600' : 'text-slate-400'} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{flag.name}</h3>
                  <p className="text-xs text-slate-400">{flag.key}</p>
                </div>
              </div>
              <button
                onClick={() => toggleFeatureFlag(flag.key)}
                className="flex items-center gap-1"
              >
                {flag.status === 'active' ? (
                  <ToggleRight size={32} className="text-emerald-600" />
                ) : (
                  <ToggleLeft size={32} className="text-slate-400" />
                )}
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-3">{flag.description}</p>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-500">{flag.category}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${flag.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {flag.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderVehicleMasterData = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Vehicle Master Data</h2>
        <button
          onClick={() => { setSelectedItem(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]"
        >
          <Plus size={18} />
          Add Vehicle Data
        </button>
      </div>

      {/* Data Types */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'Makes', count: stats?.vehicleMasterData?.makes || 45, type: 'make' },
          { label: 'Models', count: stats?.vehicleMasterData?.models || 234, type: 'model' },
          { label: 'Body Types', count: stats?.vehicleMasterData?.bodyTypes || 15, type: 'body_type' },
          { label: 'Fuel Types', count: 8, type: 'fuel_type' },
          { label: 'Transmissions', count: 4, type: 'transmission_type' },
          { label: 'Colors', count: 24, type: 'color' },
        ].map((item) => (
          <button
            key={item.type}
            onClick={() => setActiveSection(`vehicle_${item.type}`)}
            className="p-4 rounded-xl border border-slate-200 hover:border-[#17244B] hover:bg-[#17244B]/5 transition-all text-center"
          >
            <div className="text-2xl font-bold text-slate-800">{item.count}</div>
            <div className="text-sm text-slate-500">{item.label}</div>
          </button>
        ))}
      </div>

      {/* Vehicle Makes List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Vehicle Makes</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Make</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Models</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Country</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[
              { make: 'Toyota', models: 45, country: 'Japan', status: 'active' },
              { make: 'Honda', models: 32, country: 'Japan', status: 'active' },
              { make: 'Nissan', models: 28, country: 'Japan', status: 'active' },
              { make: 'Subaru', models: 18, country: 'Japan', status: 'active' },
              { make: 'Mitsubishi', models: 22, country: 'Japan', status: 'active' },
              { make: 'Isuzu', models: 12, country: 'Japan', status: 'active' },
              { make: 'Volkswagen', models: 35, country: 'Germany', status: 'active' },
              { make: 'Mercedes-Benz', models: 42, country: 'Germany', status: 'active' },
              { make: 'BMW', models: 38, country: 'Germany', status: 'active' },
              { make: 'Ford', models: 30, country: 'USA', status: 'active' },
              { make: 'BYD', models: 15, country: 'China', status: 'active' },
              { make: 'Geely', models: 12, country: 'China', status: 'active' },
            ].map((item, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center">
                      <Car size={18} className="text-slate-400" />
                    </div>
                    <span className="font-medium text-slate-800">{item.make}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600">{item.models}</td>
                <td className="px-6 py-4 text-slate-600">{item.country}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">{item.status}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button className="p-2 hover:bg-slate-100 rounded-lg">
                      <Edit size={16} className="text-slate-500" />
                    </button>
                    <button className="p-2 hover:bg-red-50 rounded-lg">
                      <Trash2 size={16} className="text-red-400" />
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

  const renderReferenceData = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Reference Data</h2>
        <button
          onClick={() => { setSelectedItem(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]"
        >
          <Plus size={18} />
          Add Reference
        </button>
      </div>

      {/* Reference Types */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Vehicle Status', count: 8, icon: Car },
          { label: 'Listing Status', count: 6, icon: Tag },
          { label: 'Dealer Levels', count: 5, icon: Users },
          { label: 'Auction Categories', count: 12, icon: Gavel },
          { label: 'Inspection Outcomes', count: 7, icon: ShieldCheck },
          { label: 'Finance Status', count: 9, icon: DollarSign },
          { label: 'Payment Methods', count: 8, icon: CreditCard },
          { label: 'Risk Levels', count: 5, icon: AlertTriangle },
        ].map((type) => (
          <button
            key={type.label}
            className="p-4 rounded-xl border border-slate-200 hover:border-[#17244B] hover:bg-[#17244B]/5 transition-all text-left"
          >
            <div className="flex items-center gap-3 mb-2">
              <type.icon size={20} className="text-slate-500" />
              <span className="font-medium text-slate-800">{type.count}</span>
            </div>
            <p className="text-sm text-slate-500">{type.label}</p>
          </button>
        ))}
      </div>

      {/* Reference Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">All Reference Values</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Value</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Label</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Display Order</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[
              { type: 'vehicle_status', value: 'active', label: 'Active', order: 1 },
              { type: 'vehicle_status', value: 'pending', label: 'Pending Review', order: 2 },
              { type: 'vehicle_status', value: 'sold', label: 'Sold', order: 3 },
              { type: 'vehicle_status', value: 'archived', label: 'Archived', order: 4 },
              { type: 'listing_status', value: 'draft', label: 'Draft', order: 1 },
              { type: 'listing_status', value: 'published', label: 'Published', order: 2 },
              { type: 'listing_status', value: 'featured', label: 'Featured', order: 3 },
              { type: 'dealer_level', value: 'basic', label: 'Basic', order: 1 },
              { type: 'dealer_level', value: 'premium', label: 'Premium', order: 2 },
              { type: 'dealer_level', value: 'elite', label: 'Elite', order: 3 },
            ].map((item, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">{item.type}</span>
                </td>
                <td className="px-6 py-4 text-slate-800 font-mono">{item.value}</td>
                <td className="px-6 py-4 text-slate-800">{item.label}</td>
                <td className="px-6 py-4 text-slate-500">{item.order}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button className="p-2 hover:bg-slate-100 rounded-lg">
                      <Edit size={16} className="text-slate-500" />
                    </button>
                    <button className="p-2 hover:bg-red-50 rounded-lg">
                      <Trash2 size={16} className="text-red-400" />
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

  const renderAuditLog = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Audit Log</h2>
        <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
          <Download size={18} />
          Export Logs
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Action</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Entity</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">User</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Previous Value</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">New Value</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Timestamp</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[
              { action: 'Update', entity: 'Feature Flag', user: 'admin@kayad.co.ke', prev: 'inactive', new: 'active', time: '2024-01-15 14:30' },
              { action: 'Create', entity: 'Vehicle Make', user: 'editor@kayad.co.ke', prev: '-', new: 'BYD', time: '2024-01-15 13:45' },
              { action: 'Update', entity: 'Config Entry', user: 'admin@kayad.co.ke', prev: '14 days', new: '30 days', time: '2024-01-15 12:00' },
              { action: 'Delete', entity: 'Reference Data', user: 'admin@kayad.co.ke', prev: 'obsolete_status', new: '-', time: '2024-01-15 10:30' },
              { action: 'Update', entity: 'Country Config', user: 'admin@kayad.co.ke', prev: 'KE', new: 'Kenya', time: '2024-01-14 16:45' },
            ].map((log, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    log.action === 'Create' ? 'bg-emerald-100 text-emerald-700' :
                    log.action === 'Update' ? 'bg-blue-100 text-blue-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-800">{log.entity}</td>
                <td className="px-6 py-4 text-slate-500 text-sm">{log.user}</td>
                <td className="px-6 py-4 text-slate-500 font-mono text-sm">{log.prev}</td>
                <td className="px-6 py-4 text-slate-800 font-mono text-sm">{log.new}</td>
                <td className="px-6 py-4 text-slate-500 text-sm">{log.time}</td>
                <td className="px-6 py-4 text-right">
                  <button className="px-3 py-1 text-xs border border-slate-200 rounded hover:bg-slate-50">
                    Rollback
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'dashboard': return renderDashboard();
      case 'features': return renderFeatureFlags();
      case 'vehicle': return renderVehicleMasterData();
      case 'reference': return renderReferenceData();
      case 'audit': return renderAuditLog();
      default: return (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-100 text-center">
          <Settings size={64} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-semibold text-slate-800 mb-2">{sections.find(s => s.id === activeSection)?.label}</h3>
          <p className="text-slate-500">This section is under development</p>
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
                  <Database size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-800">Configuration Center</h1>
                  <p className="text-xs text-slate-500">Master Data Management</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-slate-100 rounded-lg">
                <RefreshCw size={20} className="text-slate-500" />
              </button>
              <button className="p-2 hover:bg-slate-100 rounded-lg">
                <Bell size={20} className="text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-73px)] sticky top-[73px] overflow-y-auto">
          <nav className="p-4 space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#17244B] text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{section.label}</span>
                  {isActive && <ChevronRight size={16} className="ml-auto" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {renderSectionContent()}
        </main>
      </div>
    </div>
  );
}
