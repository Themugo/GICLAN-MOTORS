import React, { useState, useEffect } from 'react';
import {
  Factory, Package, Layout, Palette, Cloud, Rocket, Bot, ShoppingCart,
  Building, Settings, Globe, BarChart3, Layers, Cpu, Database, Zap,
  Shield, Users, FileText, DollarSign, Plus, ChevronRight, RefreshCw,
  Play, Pause, Trash2, Edit, Eye, Download, Upload, CheckCircle, AlertTriangle,
  Clock, TrendingUp, Server, Code, Palette as PaletteIcon, Monitor
} from 'lucide-react';
import * as pfApi from '../../../services/platformFactoryApi';

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
  purple: '#8B5CF6',
};

const modules = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, color: colors.navy },
  { id: 'templates', label: 'Templates', icon: Layout, color: colors.emerald },
  { id: 'products', label: 'Products', icon: Package, color: colors.terracotta },
  { id: 'components', label: 'Components', icon: Layers, color: colors.purple },
  { id: 'services', label: 'Services', icon: Cpu, color: colors.softBlue },
  { id: 'branding', label: 'Branding', icon: PaletteIcon, color: colors.mutedOrange },
  { id: 'deploy', label: 'Deployment', icon: Cloud, color: colors.navy },
  { id: 'store', label: 'App Store', icon: Rocket, color: colors.emerald },
];

export default function PlatformFactory() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [products, setProducts] = useState([]);
  const [components, setComponents] = useState([]);
  const [services, setServices] = useState([]);
  const [brands, setBrands] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [productDescription, setProductDescription] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const { data: dashData } = await pfApi.getPlatformDashboard();
      setDashboard(dashData.data);

      const { data: tempData } = await pfApi.getTemplates();
      setTemplates(tempData.data);

      const { data: prodData } = await pfApi.getProducts();
      setProducts(prodData.data);

      const { data: compData } = await pfApi.getComponents();
      setComponents(compData.data);

      const { data: servData } = await pfApi.getSharedServices();
      setServices(servData.data);

      const { data: brandData } = await pfApi.getBrands();
      setBrands(brandData.data);

      const { data: healthData } = await pfApi.getPlatformHealth();
      setHealth(healthData.data);
    } catch (error) {
      console.error('Failed to load platform data:', error);
      setDashboard({
        totalProducts: 5,
        activeProducts: 4,
        totalRevenue: 123456789,
        totalUsers: 45678,
        templates: 13,
        components: 89,
        health: 94.5,
      });
      setProducts([
        { id: '1', name: 'KAYAD Cars', template: 'Vehicle Marketplace', status: 'production', health: 94.5, users: 23456 },
        { id: '2', name: 'KAYAD Fleet', template: 'Fleet Management', status: 'production', health: 92.3, users: 4567 },
      ]);
      setTemplates([
        { id: '1', name: 'Vehicle Marketplace', category: 'automotive', popularity: 98 },
        { id: '2', name: 'Fleet Management', category: 'automotive', popularity: 85 },
        { id: '3', name: 'Vehicle Rental', category: 'automotive', popularity: 78 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateProduct = async () => {
    if (!productDescription.trim()) return;
    try {
      const { data } = await pfApi.generateProduct({
        description: productDescription,
        template: 'custom',
      });
      setShowGenerator(false);
      setProductDescription('');
      loadAllData();
    } catch (error) {
      console.error('Failed to generate product:', error);
    }
  };

  // ============================================
  // DASHBOARD
  // ============================================

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Platform Factory Dashboard</h2>
          <p className="text-slate-500">Manage and generate new digital products</p>
        </div>
        <button onClick={() => setShowGenerator(true)} className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]">
          <Plus size={18} />
          Generate Product
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Package size={20} className="text-blue-600" />
            <span className="text-sm text-slate-500">Total Products</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{dashboard?.totalProducts}</p>
          <p className="text-xs text-emerald-600 mt-2">{dashboard?.activeProducts} active</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={20} className="text-emerald-600" />
            <span className="text-sm text-slate-500">Total Revenue</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{(dashboard?.totalRevenue / 1000000).toFixed(1)}M</p>
          <p className="text-xs text-slate-500 mt-2">Across all products</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Users size={20} className="text-purple-600" />
            <span className="text-sm text-slate-500">Total Users</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{(dashboard?.totalUsers / 1000).toFixed(1)}K</p>
          <p className="text-xs text-emerald-600 mt-2">+12% growth</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={20} className="text-emerald-600" />
            <span className="text-sm text-slate-500">Platform Health</span>
          </div>
          <p className="text-3xl font-bold text-emerald-600">{dashboard?.health}%</p>
          <p className="text-xs text-slate-500 mt-2">All systems operational</p>
        </div>
      </div>

      {/* Platform Health */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Product Health Overview</h3>
        <div className="space-y-3">
          {health?.products?.map((product) => (
            <div key={product.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  product.status === 'healthy' ? 'bg-emerald-500' :
                  product.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                }`} />
                <span className="font-medium text-slate-800">{product.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-32">
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{
                      width: `${product.health}%`,
                      backgroundColor: product.health >= 90 ? colors.emerald : product.health >= 70 ? colors.softBlue : colors.mutedOrange
                    }} />
                  </div>
                </div>
                <span className="text-sm font-medium text-slate-600">{product.health}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Products */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Recent Products</h3>
        <div className="grid grid-cols-3 gap-4">
          {products.slice(0, 3).map((product) => (
            <div key={product.id} className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-slate-800">{product.name}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  product.status === 'production' ? 'bg-emerald-100 text-emerald-700' :
                  product.status === 'staging' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {product.status}
                </span>
              </div>
              <p className="text-sm text-slate-500">{product.template}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                <span>{product.users?.toLocaleString()} users</span>
                <span>{product.health}% health</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================
  // TEMPLATES
  // ============================================

  const renderTemplates = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Platform Templates</h2>

      <div className="grid grid-cols-3 gap-4">
        {templates.map((template) => (
          <div key={template.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-[#17244B] rounded-lg flex items-center justify-center">
                <ShoppingCart size={24} className="text-white" />
              </div>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{template.category}</span>
            </div>
            <h3 className="font-semibold text-slate-800 mb-2">{template.name}</h3>
            <p className="text-sm text-slate-500 mb-4">{template.description}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <TrendingUp size={14} className="text-emerald-600" />
                <span className="text-sm text-emerald-600">{template.popularity}%</span>
              </div>
              <button className="text-sm text-[#17244B] font-medium hover:underline">
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // PRODUCTS
  // ============================================

  const renderProducts = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Product Registry</h2>
        <button onClick={() => setShowGenerator(true)} className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]">
          <Plus size={18} />
          New Product
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Template</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Health</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Users</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-800">{product.name}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{product.template}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    product.status === 'production' ? 'bg-emerald-100 text-emerald-700' :
                    product.status === 'staging' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {product.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-slate-200 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{
                        width: `${product.health}%`,
                        backgroundColor: product.health >= 90 ? colors.emerald : product.health >= 70 ? colors.softBlue : colors.mutedOrange
                      }} />
                    </div>
                    <span className="text-sm text-slate-600">{product.health}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{product.users?.toLocaleString()}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-1.5 hover:bg-slate-100 rounded-lg">
                      <Eye size={16} className="text-slate-500" />
                    </button>
                    <button className="p-1.5 hover:bg-slate-100 rounded-lg">
                      <Edit size={16} className="text-slate-500" />
                    </button>
                    <button className="p-1.5 hover:bg-slate-100 rounded-lg">
                      <Settings size={16} className="text-slate-500" />
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

  // ============================================
  // COMPONENTS
  // ============================================

  const renderComponents = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Component Library</h2>

      <div className="grid grid-cols-4 gap-3">
        {components.map((comp) => (
          <div key={comp.id} className="bg-white rounded-lg p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <Layers size={16} className="text-[#17244B]" />
              <span className="text-sm font-medium text-slate-800">{comp.name}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="px-1.5 py-0.5 bg-slate-100 rounded">{comp.category}</span>
              <span>{comp.usage}% used</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // SERVICES
  // ============================================

  const renderServices = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Shared Services</h2>

      <div className="grid grid-cols-3 gap-4">
        {services.map((service) => (
          <div key={service.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-[#17244B] rounded-lg flex items-center justify-center">
                <Cpu size={20} className="text-white" />
              </div>
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle size={14} />
                {service.uptime}%
              </span>
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">{service.name}</h3>
            <p className="text-sm text-slate-500 mb-3">{service.description}</p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Server size={12} />
              <span>{service.latency}ms latency</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // BRANDING
  // ============================================

  const renderBranding = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">White Label Manager</h2>

      <div className="grid grid-cols-2 gap-4">
        {brands.map((brand) => (
          <div key={brand.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: brand.primaryColor }}>
                  <Globe size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{brand.name}</h3>
                  <p className="text-xs text-slate-500">{brand.domain}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                brand.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {brand.status}
              </span>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded border border-slate-200" style={{ backgroundColor: brand.primaryColor }} />
                <span className="text-xs text-slate-500">Primary</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded border border-slate-200" style={{ backgroundColor: brand.accentColor }} />
                <span className="text-xs text-slate-500">Accent</span>
              </div>
            </div>
            <button className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">
              Edit Branding
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // DEPLOYMENT
  // ============================================

  const renderDeploy = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Deployment Manager</h2>

      <div className="grid grid-cols-4 gap-4">
        {['Development', 'Staging', 'Production', 'Canary'].map((env) => (
          <div key={env} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">{env}</h3>
              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Instances</span>
                <span>{env === 'Production' ? 3 : 1}</span>
              </div>
              <div className="flex justify-between">
                <span>Uptime</span>
                <span className="text-emerald-600">99.9%</span>
              </div>
              <div className="flex justify-between">
                <span>Scaling</span>
                <span>{env === 'Production' ? 'Auto' : 'Manual'}</span>
              </div>
            </div>
            <button className="w-full mt-4 px-3 py-2 bg-[#17244B] text-white rounded-lg text-sm hover:bg-[#1e3054]">
              Manage
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // APP STORE
  // ============================================

  const renderStore = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">App Store</h2>

      <div className="grid grid-cols-3 gap-4">
        {[
          { name: 'Premium Theme', type: 'theme', price: 'Free', installs: 2345, rating: 4.8 },
          { name: 'Vehicle History Report', type: 'plugin', price: 'KES 500', installs: 567, rating: 4.9 },
          { name: 'Insurance Integration', type: 'integration', price: 'KES 1,000', installs: 234, rating: 4.6 },
          { name: 'AI Valuation Report', type: 'ai', price: 'KES 100', installs: 789, rating: 4.9 },
          { name: 'WhatsApp Integration', type: 'integration', price: 'KES 2,000', installs: 456, rating: 4.8 },
          { name: 'Automotive Pack', type: 'industry', price: 'KES 5,000', installs: 89, rating: 4.9 },
        ].map((app, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Rocket size={20} className="text-purple-600" />
              </div>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{app.type}</span>
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">{app.name}</h3>
            <div className="flex items-center gap-3 mb-3 text-sm text-slate-500">
              <span>{app.price}</span>
              <span>•</span>
              <span>{app.installs} installs</span>
              <span>•</span>
              <span className="text-amber-500">★ {app.rating}</span>
            </div>
            <button className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">
              Install
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // PRODUCT GENERATOR MODAL
  // ============================================

  const renderGeneratorModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8" onClick={() => setShowGenerator(false)}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#17244B] rounded-lg flex items-center justify-center">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">AI Product Generator</h2>
              <p className="text-sm text-slate-500">Describe your product and AI will generate it</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Product Description
            </label>
            <textarea
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="e.g., I want a heavy machinery marketplace for construction equipment..."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#17244B] h-32"
            />
          </div>
          <div className="bg-slate-50 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-slate-800 mb-2">AI will create:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-600" />
                <span>Database Schema</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-600" />
                <span>API Endpoints</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-600" />
                <span>Admin Panel</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-600" />
                <span>User Interface</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-600" />
                <span>Shared Services</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-600" />
                <span>AI Components</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowGenerator(false)}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateProduct}
              disabled={!productDescription.trim()}
              className="flex-1 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Rocket size={18} />
              Generate Product
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'dashboard': return renderDashboard();
      case 'templates': return renderTemplates();
      case 'products': return renderProducts();
      case 'components': return renderComponents();
      case 'services': return renderServices();
      case 'branding': return renderBranding();
      case 'deploy': return renderDeploy();
      case 'store': return renderStore();
      default: return renderDashboard();
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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#17244B] to-[#2a3a6e] flex items-center justify-center">
                  <Factory size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-800">Platform Factory</h1>
                  <p className="text-xs text-slate-500">Digital Product Generation</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm">
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                {dashboard?.activeProducts || 0} Active Products
              </div>
              <button onClick={loadAllData} className="p-2 hover:bg-slate-100 rounded-lg">
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-slate-200 min-h-[calc(100vh-73px)] sticky top-[73px] overflow-y-auto">
          <nav className="p-4 space-y-1">
            {modules.map((mod) => {
              const Icon = mod.icon;
              const isActive = activeModule === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive ? 'bg-[#17244B] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{mod.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {renderModuleContent()}
        </main>
      </div>

      {/* Generator Modal */}
      {showGenerator && renderGeneratorModal()}
    </div>
  );
}
