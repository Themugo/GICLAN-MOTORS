import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, FileText, LandingPage, Newspaper, BookOpen,
  HelpCircle, Megaphone, Image, Palette, Calendar, Search,
  BarChart3, Globe, SplitSquareVertical, Settings, ChevronRight,
  Plus, Eye, Edit, Trash2, Clock, CheckCircle, AlertCircle,
  FolderOpen, Tag, Filter, MoreVertical, Bell, TrendingUp
} from 'lucide-react';
import * as cmsApi from '../../../services/cmsApi';
import VisualPageBuilder from './components/VisualPageBuilder';
import MediaLibrary from './components/MediaLibrary';
import SEOManager from './components/SEOManager';
import PublishingCalendar from './components/PublishingCalendar';

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
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: colors.navy },
  { id: 'pages', label: 'Pages', icon: FileText, color: colors.softBlue },
  { id: 'landing', label: 'Landing Pages', icon: LandingPage, color: colors.emerald },
  { id: 'blog', label: 'Blog', icon: Newspaper, color: colors.terracotta },
  { id: 'news', label: 'News', icon: BookOpen, color: '#8B5CF6' },
  { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen, color: '#06B6D4' },
  { id: 'help', label: 'Help Center', icon: HelpCircle, color: '#F59E0B' },
  { id: 'faq', label: 'FAQ', icon: HelpCircle, color: colors.mutedOrange },
  { id: 'announcements', label: 'Announcements', icon: Bell, color: colors.mutedCrimson },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone, color: '#EC4899' },
  { id: 'promotions', label: 'Promotions', icon: TrendingUp, color: colors.emerald },
  { id: 'banners', label: 'Banners', icon: Image, color: '#A855F7' },
  { id: 'media', label: 'Media Library', icon: FolderOpen, color: colors.softBlue },
  { id: 'seo', label: 'SEO', icon: Globe, color: colors.navy },
  { id: 'calendar', label: 'Calendar', icon: Calendar, color: '#14B8A6' },
  { id: 'abtests', label: 'A/B Tests', icon: SplitSquareVertical, color: '#F97316' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, color: '#6366F1' },
  { id: 'widgets', label: 'Widgets', icon: Palette, color: '#D946EF' },
];

const statusColors = {
  draft: 'bg-slate-100 text-slate-700',
  scheduled: 'bg-blue-100 text-blue-700',
  published: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-slate-100 text-slate-500',
};

const statusIcons = {
  draft: Clock,
  scheduled: Clock,
  published: CheckCircle,
  archived: AlertCircle,
};

export default function ContentStudio() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    loadStats();
    loadPages();
  }, []);

  const loadPages = async () => {
    try {
      setPagesLoading(true);
      setPageError('');
      const response = await cmsApi.getPages({ limit: 100 });
      const items = response?.data?.data || [];
      setPages(items);
      setSelectedPage(current => current && items.some(p => p.id === current.id) ? current : items[0] || null);
    } catch (error) {
      setPageError(error?.response?.data?.error || error?.message || 'Failed to load pages');
    } finally {
      setPagesLoading(false);
    }
  };

  const createNewPage = async () => {
    const title = window.prompt('Page title');
    if (!title?.trim()) return;
    const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    try {
      const response = await cmsApi.createPage({ title: title.trim(), slug, pageType: 'custom', content: [], status: 'draft' });
      const created = response?.data || response;
      await loadPages();
      setSelectedPage(created);
      setActiveModule('pages');
    } catch (error) {
      setPageError(error?.response?.data?.error || error?.message || 'Failed to create page');
    }
  };

  const handlePageSaved = (savedPage) => {
    setPages(current => current.map(page => page.id === savedPage.id ? savedPage : page));
    setSelectedPage(savedPage);
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const { data } = await cmsApi.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
      // No synthetic production fallback: the UI remains empty until the backend responds.
    } finally {
      setLoading(false);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Content Overview</h2>
        <button onClick={createNewPage} className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054] transition-colors">
          <Plus size={18} />
          Create Page
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Pages', value: stats?.pages?.total || 0, sub: `${stats?.pages?.published || 0} published`, color: colors.softBlue },
          { label: 'Articles', value: stats?.content?.total || 0, sub: `${stats?.content?.published || 0} published`, color: colors.terracotta },
          { label: 'Media Files', value: stats?.media?.total || 0, sub: 'in library', color: colors.emerald },
          { label: 'FAQs', value: stats?.faqs?.total || 0, sub: 'articles', color: colors.mutedOrange },
          { label: 'Active Campaigns', value: stats?.campaigns?.active || 0, sub: 'running', color: '#EC4899' },
          { label: 'Active Banners', value: stats?.banners?.active || 0, sub: 'on site', color: '#A855F7' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}20` }}>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stat.color }} />
              </div>
              <span className="text-sm text-slate-500">{stat.label}</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
            <div className="text-xs text-slate-400 mt-1">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Weekly Analytics */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">This Week's Performance</h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-[#17244B]">{stats?.analytics?.weekViews?.toLocaleString() || 0}</div>
            <div className="text-sm text-slate-500 mt-1">Page Views</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-600">{stats?.analytics?.weekClicks?.toLocaleString() || 0}</div>
            <div className="text-sm text-slate-500 mt-1">Clicks</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[#C77B58]">{stats?.analytics?.weekConversions?.toLocaleString() || 0}</div>
            <div className="text-sm text-slate-500 mt-1">Conversions</div>
          </div>
        </div>
      </div>

      {/* Recent Content */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'New Page', icon: FileText, module: 'pages' },
            { label: 'Write Article', icon: Newspaper, module: 'blog' },
            { label: 'Add FAQ', icon: HelpCircle, module: 'faq' },
            { label: 'Create Campaign', icon: Megaphone, module: 'campaigns' },
            { label: 'Upload Media', icon: Image, module: 'media' },
            { label: 'Schedule Post', icon: Calendar, module: 'calendar' },
            { label: 'View Analytics', icon: BarChart3, module: 'analytics' },
            { label: 'Manage SEO', icon: Globe, module: 'seo' },
          ].map((action, i) => (
            <button
              key={i}
              onClick={() => setActiveModule(action.module)}
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-[#17244B] hover:bg-[#17244B]/5 transition-all"
            >
              <action.icon size={20} className="text-slate-600" />
              <span className="text-sm font-medium text-slate-700">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderModuleContent = () => {
    const module = modules.find(m => m.id === activeModule);

    if (activeModule === 'pages' || activeModule === 'landing') {
      const filteredPages = pages.filter((page) => {
        const statusMatch = filterStatus === 'all' || page.status === filterStatus;
        const query = searchQuery.trim().toLowerCase();
        const searchMatch = !query || String(page.title || page.pageName || '').toLowerCase().includes(query) || String(page.slug || '').toLowerCase().includes(query);
        return statusMatch && searchMatch;
      });
      return (
        <div className="min-h-[calc(100vh-73px)] flex flex-col">
          <div className="p-6 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{activeModule === 'landing' ? 'Landing Pages' : 'Pages'}</h2>
                <p className="text-sm text-slate-500">Build and publish real site pages from persisted content.</p>
              </div>
              <button onClick={createNewPage} className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg"><Plus size={18} /> New Page</button>
            </div>
            {pageError && <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{pageError}</div>}
          </div>
          <div className="flex flex-1 min-h-0">
            <aside className="w-80 bg-white border-r border-slate-200 overflow-y-auto p-4">
              {pagesLoading ? <div className="text-sm text-slate-400 p-4">Loading pages…</div> : filteredPages.length === 0 ? <div className="text-sm text-slate-400 p-4">No pages found.</div> : filteredPages.map((page) => (
                <button key={page.id} onClick={() => setSelectedPage(page)} className={`w-full text-left p-4 rounded-lg mb-2 border ${selectedPage?.id === page.id ? 'border-[#17244B] bg-[#17244B]/5' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className="font-medium text-slate-800 truncate">{page.title || page.pageName || 'Untitled page'}</div>
                  <div className="text-xs text-slate-500 mt-1 truncate">/{page.slug}</div>
                  <span className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-xs ${statusColors[page.status] || statusColors.draft}`}>{page.status || 'draft'}</span>
                </button>
              ))}
            </aside>
            <main className="flex-1 min-w-0">
              {selectedPage ? <VisualPageBuilder page={selectedPage} onSaved={handlePageSaved} /> : <div className="h-full flex items-center justify-center text-slate-400">Create or select a page to begin.</div>}
            </main>
          </div>
        </div>
      );
    }
    const Icon = module?.icon || FileText;

    return (
      <div className="space-y-6">
        {/* Module Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${module?.color}20` }}>
              <Icon size={24} style={{ color: module?.color }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{module?.label}</h2>
              <p className="text-sm text-slate-500">Manage your {module?.label?.toLowerCase()} content</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054] transition-colors">
            <Plus size={18} />
            New {module?.label.replace('s', '').replace(' Pages', ' Page')}
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder={`Search ${module?.label.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-[#17244B] focus:ring-2 focus:ring-[#17244B]/20 outline-none transition-all"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-slate-200 focus:border-[#17244B] outline-none"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50">
            <Filter size={18} />
            More Filters
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
          <div className="text-center max-w-xl mx-auto">
            <Icon size={36} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-lg font-semibold text-slate-800">{module?.label} is not connected to a canonical editor yet</h3>
            <p className="text-sm text-slate-500 mt-2">No synthetic records are shown. Connect this module to its persisted CMS domain before publishing it.</p>
          </div>
        </div>
      </div>
    );
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
                  <Palette size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-800">Content Studio</h1>
                  <p className="text-xs text-slate-500">KAYAD Enterprise CMS</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Quick search..."
                  className="pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-[#17244B] focus:ring-2 focus:ring-[#17244B]/20 outline-none w-64"
                />
              </div>
              <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                <Bell size={20} />
              </button>
              <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                <Settings size={20} />
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
        <main className="flex-1 p-0">
          {activeModule === 'dashboard' && renderDashboard()}
          {activeModule === 'pages' && <VisualPageBuilder />}
          {activeModule === 'landing' && <VisualPageBuilder />}
          {activeModule === 'media' && <MediaLibrary />}
          {activeModule === 'seo' && <SEOManager />}
          {activeModule === 'calendar' && <PublishingCalendar />}
          {activeModule === 'blog' && renderModuleContent()}
          {activeModule === 'news' && renderModuleContent()}
          {activeModule === 'knowledge' && renderModuleContent()}
          {activeModule === 'help' && renderModuleContent()}
          {activeModule === 'faq' && renderModuleContent()}
          {activeModule === 'announcements' && renderModuleContent()}
          {activeModule === 'campaigns' && renderModuleContent()}
          {activeModule === 'promotions' && renderModuleContent()}
          {activeModule === 'banners' && renderModuleContent()}
          {activeModule === 'widgets' && renderModuleContent()}
          {activeModule === 'abtests' && renderModuleContent()}
          {activeModule === 'analytics' && renderModuleContent()}
        </main>
      </div>
    </div>
  );
}
