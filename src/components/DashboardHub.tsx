import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Bell, Car, ChevronRight, ClipboardCheck, LayoutDashboard, RefreshCw, Settings2, ShieldCheck, ShoppingBag, Users, Wrench } from 'lucide-react';
import { getOwnershipDashboard } from '../services/ownershipApi';
import * as dealerApi from '../services/dealerPlatformApi';
import { getControlPlaneSnapshot } from '../services/commandCenterApi';
import { inspectionAPI } from '../api/api';

type Props = { user: any; vehicles?: any[]; onNavigate: (nav: string) => void };

type RoleConfig = { title: string; subtitle: string; accent: string; actions: Array<{ label: string; nav: string; icon: React.ElementType }> };

const configs: Record<string, RoleConfig> = {
  user: { title: 'Buyer Dashboard', subtitle: 'Your saved vehicles, active transactions and next actions.', accent: '#2563EB', actions: [{label:'Browse vehicles',nav:'marketplace',icon:Car},{label:'Saved vehicles',nav:'saved',icon:ShoppingBag},{label:'Auctions',nav:'auctions',icon:Activity},{label:'Escrow vault',nav:'escrow',icon:ShieldCheck}] },
  buyer: { title: 'Buyer Dashboard', subtitle: 'Your saved vehicles, active transactions and next actions.', accent: '#2563EB', actions: [{label:'Browse vehicles',nav:'marketplace',icon:Car},{label:'Saved vehicles',nav:'saved',icon:ShoppingBag},{label:'Auctions',nav:'auctions',icon:Activity},{label:'Escrow vault',nav:'escrow',icon:ShieldCheck}] },
  individual_seller: { title: 'Private Seller Dashboard', subtitle: 'Manage your listings, buyer interest and verification status.', accent: '#059669', actions: [{label:'Seller workspace',nav:'seller-dashboard',icon:LayoutDashboard},{label:'Add / manage cars',nav:'seller-platform',icon:Car},{label:'Inspections',nav:'inspections',icon:ClipboardCheck},{label:'Messages',nav:'chat',icon:Bell}] },
  broker: { title: 'Seller Dashboard', subtitle: 'Manage seller inventory and marketplace activity.', accent: '#D97706', actions: [{label:'Seller workspace',nav:'seller-dashboard',icon:LayoutDashboard},{label:'Marketplace',nav:'marketplace',icon:Car},{label:'Messages',nav:'chat',icon:Bell}] },
  dealer: { title: 'Dealer Dashboard', subtitle: 'Commercial inventory, leads, auctions, subscriptions and payouts.', accent: '#D97706', actions: [{label:'Dealer workspace',nav:'dealer-dashboard',icon:LayoutDashboard},{label:'Inventory',nav:'dealer-dashboard',icon:Car},{label:'Auctions',nav:'auctions',icon:Activity},{label:'Finance',nav:'finance',icon:BarChart3}] },
  ghost_checker: { title: 'Inspector Dashboard', subtitle: 'Assigned inspections, evidence and execution status.', accent: '#7C3AED', actions: [{label:'Inspection work',nav:'inspections',icon:ClipboardCheck},{label:'Messages',nav:'chat',icon:Bell}] },
};

const staffActions = [{label:'Control plane',nav:'admin',icon:LayoutDashboard},{label:'Vehicle moderation',nav:'admin',icon:Car},{label:'Inspections',nav:'inspections',icon:ClipboardCheck},{label:'Support',nav:'support',icon:Users}];

export default function DashboardHub({ user, vehicles = [], onNavigate }: Props) {
  const role = user?.role || 'user';
  const config = configs[role] || (['admin','superadmin','marketing','technical_support','hr','accounts','escrow_officer','ad_manager','moderator'].includes(role) ? { title: 'Platform Operations Dashboard', subtitle: 'Role-scoped control, queues and platform health.', accent: '#4F46E5', actions: staffActions } : configs.user);
  const [density, setDensity] = useState<'comfortable'|'compact'>('comfortable');
  const [hidden, setHidden] = useState<string[]>([]);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sourceError, setSourceError] = useState('');

  const cards = useMemo(() => {
    const owned = vehicles.filter((v) => v?.sellerId && v.sellerId === (user?.id || user?._id));
    if (role === 'dealer' || role === 'individual_seller' || role === 'broker') return [{id:'inventory',label:'Your inventory',value:owned.length,icon:Car},{id:'saved',label:'Saved vehicles',value:0,icon:ShoppingBag},{id:'activity',label:'Marketplace activity',value:vehicles.length,icon:Activity}];
    if (['admin','superadmin','marketing','technical_support','hr','accounts','escrow_officer','ad_manager','moderator'].includes(role)) return [{id:'users',label:'Users',value:snapshot?.counts?.users ?? '—',icon:Users},{id:'cars',label:'Vehicles',value:snapshot?.counts?.cars ?? '—',icon:Car},{id:'incidents',label:'Incidents',value:snapshot?.counts?.incidents ?? '—',icon:Activity},{id:'alerts',label:'Alerts',value:snapshot?.counts?.alerts ?? '—',icon:Bell}];
    if (role === 'ghost_checker') return [{id:'assigned',label:'Assigned inspections',value:'—',icon:ClipboardCheck},{id:'messages',label:'Messages',value:'—',icon:Bell},{id:'market',label:'Marketplace',value:vehicles.length,icon:Car}];
    return [{id:'saved',label:'Saved vehicles',value:0,icon:ShoppingBag},{id:'vehicles',label:'Marketplace inventory',value:vehicles.length,icon:Car},{id:'alerts',label:'Action alerts',value:'—',icon:Bell}];
  }, [vehicles, user, role, snapshot]);

  const refresh = async () => {
    setLoading(true); setSourceError('');
    try {
      if (['admin','superadmin','marketing','technical_support','hr','accounts','escrow_officer','ad_manager','moderator'].includes(role)) {
        const result = await getControlPlaneSnapshot(); setSnapshot(result?.data || result);
      } else if (role === 'dealer') {
        const result = await dealerApi.getDealerDashboard(); setSnapshot(result?.data || result);
      } else if (role === 'user' || role === 'buyer') {
        const result = await getOwnershipDashboard(); setSnapshot(result?.data || result);
      } else if (role === 'ghost_checker') {
        const result = await inspectionAPI.myOrders?.(); setSnapshot(result?.data || result);
      }
    } catch (e) { setSourceError('Live dashboard data could not be refreshed. Existing values were not replaced with mock data.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, [role]);

  const toggle = (id: string) => setHidden((prev) => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev,id]);

  return <section className="space-y-6 pb-10" data-dashboard-role={role}>
    <div className="rounded-3xl p-6 text-white shadow-lg" style={{background:`linear-gradient(135deg, ${config.accent}, #17244B)`}}>
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">KAYAD workspace</p><h1 className="mt-1 text-2xl font-black">{config.title}</h1><p className="mt-1 max-w-2xl text-sm text-white/70">{config.subtitle}</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/15"><RefreshCw size={14} className={loading?'animate-spin':''}/> Refresh</button><button onClick={()=>setDensity(density==='comfortable'?'compact':'comfortable')} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold"><Settings2 size={14}/> {density==='comfortable'?'Compact':'Comfortable'}</button></div>
      </div>
    </div>

    {sourceError && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">{sourceError}</div>}

    <div className={`grid gap-3 ${density==='compact'?'sm:grid-cols-4':'sm:grid-cols-2 lg:grid-cols-4'}`}>
      {cards.filter(c=>!hidden.includes(c.id)).map((card)=>{const Icon=card.icon;return <div key={card.id} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{card.label}</p><p className="mt-1 text-2xl font-black text-[#17244B]">{card.value}</p></div><Icon size={20} style={{color:config.accent}}/></div><button onClick={()=>toggle(card.id)} className="mt-3 text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100">Hide card</button></div>})}
    </div>

    <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-black text-[#17244B]">Workspace controls</h2><p className="text-xs text-slate-500">Role-scoped shortcuts into the existing canonical modules.</p></div><BarChart3 size={18} className="text-slate-300"/></div><div className="grid gap-3 sm:grid-cols-2">{config.actions.map((action)=>{const Icon=action.icon;return <button key={action.label+action.nav} onClick={()=>onNavigate(action.nav)} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-left hover:border-slate-300 hover:shadow-sm"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-[#17244B]"><Icon size={17}/></span><span className="flex-1 text-xs font-black text-slate-700">{action.label}</span><ChevronRight size={15} className="text-slate-300"/></button>})}</div></div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><h2 className="text-sm font-black text-[#17244B]">Dashboard controls</h2><div className="mt-4 space-y-3 text-xs text-slate-600"><button onClick={()=>setHidden([])} className="w-full rounded-xl bg-white px-3 py-2.5 text-left font-bold border border-slate-200">Restore hidden cards</button><button onClick={()=>setDensity('comfortable')} className="w-full rounded-xl bg-white px-3 py-2.5 text-left font-bold border border-slate-200">Reset comfortable density</button><p className="pt-2 text-[11px] leading-5 text-slate-400">The dashboard shell changes presentation only. Counts and workflow state remain sourced from KAYAD APIs; no placeholder records are created.</p></div></div>
    </div>
  </section>;
}
