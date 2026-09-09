import React, { useEffect, useMemo, useState } from 'react';
import type { Vehicle } from '../types';
import { adminAPI } from '../api/api.exports';
import {
  AlertTriangle,
  Ban,
  Car,
  CheckCircle2,
  FileCheck,
  History,
  Send,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Badge, Button, Card, Input, PageHeader, StatWidget, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui';
import AdminCommunications from '../pages/admin/AdminCommunications';

interface AdminViewProps {
  vehicles: Vehicle[];
  onQuickViewVehicle?: (vehicle: Vehicle) => void;
}

type AdminStats = Record<string, number>;
type AdminUser = {
  _id: string;
  name?: string;
  email?: string;
  role?: string;
  isBanned?: boolean;
  approved?: boolean;
  status?: string;
};
type AdminCar = {
  _id: string;
  title?: string;
  status?: string;
  auctionStatus?: string;
  price?: number;
  dealer?: { name?: string; email?: string };
  seller?: { name?: string; email?: string };
};
type AuditRecord = {
  _id?: string;
  id?: string;
  action?: string;
  module?: string;
  actor?: { name?: string; email?: string };
  user?: { name?: string; email?: string };
  targetId?: string;
  createdAt?: string;
  timestamp?: string;
};

function unwrap<T = any>(value: any): T {
  if (value && typeof value === 'object' && 'data' in value) return value.data as T;
  return value as T;
}

export const AdminView: React.FC<AdminViewProps> = ({ vehicles, onQuickViewVehicle }) => {
  const [stats, setStats] = useState<AdminStats>({});
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [cars, setCars] = useState<AdminCar[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([]);
  const [module, setModule] = useState<'overview' | 'users' | 'cars' | 'audit' | 'communications'>('overview');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, usersRes, carsRes, auditRes] = await Promise.all([
        adminAPI.stats(),
        adminAPI.users({ page: 1, limit: 50, search: search || undefined }),
        adminAPI.cars({ page: 1, limit: 50, search: search || undefined }),
        adminAPI.getAuditLogs({ page: 1, limit: 25 }),
      ]);
      const statsPayload = unwrap<any>(statsRes);
      const usersPayload = unwrap<any>(usersRes);
      const carsPayload = unwrap<any>(carsRes);
      const auditPayload = unwrap<any>(auditRes);
      setStats(statsPayload?.stats || statsPayload || {});
      setUsers(usersPayload?.users || []);
      setCars(carsPayload?.cars || []);
      setAuditLogs(auditPayload?.logs || auditPayload?.auditLogs || []);
    } catch (err: any) {
      setError(err?.message || 'The administration API could not be reached. No local/demo data is displayed.');
      setStats({});
      setUsers([]);
      setCars([]);
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => `${u.name || ''} ${u.email || ''} ${u.role || ''}`.toLowerCase().includes(q));
  }, [users, search]);

  const filteredCars = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cars;
    return cars.filter((c) => `${c.title || ''} ${c._id} ${c.status || ''}`.toLowerCase().includes(q));
  }, [cars, search]);

  const toggleBan = async (user: AdminUser) => {
    setBusyId(user._id);
    setActionError(null);
    try {
      await adminAPI.toggleBan(user._id);
      await load();
    } catch (err: any) {
      setActionError(err?.message || 'The server rejected this account action.');
    } finally {
      setBusyId(null);
    }
  };

  const verifyCar = async (car: AdminCar) => {
    setBusyId(car._id);
    setActionError(null);
    try {
      await adminAPI.verifyCar(car._id, { ntsaVerified: true, logbookVerified: true });
      await load();
    } catch (err: any) {
      setActionError(err?.message || 'The server rejected this vehicle verification action.');
    } finally {
      setBusyId(null);
    }
  };

  const stat = (key: string) => Number(stats[key] || 0).toLocaleString();

  return (
    <div className="space-y-6">
      <PageHeader
        variant="navy"
        badgeIcon={<ShieldCheck className="w-4 h-4 text-amber-400" />}
        badgeText="KAYAD Administration"
        title="Production Operations Console"
        description="Live administration data from the protected KAYAD backend. This console does not create or display fabricated operational records."
        rightElement={<Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</Button>}
      />

      {(error || actionError) && (
        <Card className="p-4 border-amber-300 bg-amber-50 text-amber-900 text-sm flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{actionError || error}</span>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {(['overview', 'users', 'cars', 'audit', 'communications'] as const).map((item) => (
          <Button key={item} variant={module === item ? 'primary' : 'outline'} size="sm" onClick={() => setModule(item)}>
            {item === 'overview' && <ShieldCheck className="w-4 h-4" />}
            {item === 'users' && <Users className="w-4 h-4" />}
            {item === 'cars' && <Car className="w-4 h-4" />}
            {item === 'audit' && <History className="w-4 h-4" />}
            {item === 'communications' && <Send className="w-4 h-4" />}
            {item[0].toUpperCase() + item.slice(1)}
          </Button>
        ))}
        {module !== 'overview' && <div className="ml-auto min-w-[240px]"><Input aria-label="Search administration records" placeholder="Search live records…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>}
      </div>

      {module === 'overview' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatWidget label="Users" value={stat('totalUsers')} icon={<Users className="w-4 h-4" />} />
            <StatWidget label="Vehicles" value={stat('totalCars')} icon={<Car className="w-4 h-4" />} />
            <StatWidget label="Active Listings" value={stat('activeListings')} icon={<CheckCircle2 className="w-4 h-4" />} />
            <StatWidget label="Live Auctions" value={stat('activeAuctions')} icon={<FileCheck className="w-4 h-4" />} />
            <StatWidget label="Open Escrows" value={stat('openEscrows')} icon={<ShieldCheck className="w-4 h-4" />} />
          </div>

          <Card className="p-5">
            <h3 className="font-bold text-[#1E3063]">Operational queues</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {[
                ['Pending dealers', stat('pendingDealers')],
                ['Pending vehicles', stat('pendingCars')],
                ['Verification queue', stat('verificationQueue')],
                ['Support queue', stat('supportQueue')],
                ['Fraud alerts', stat('fraudAlerts')],
                ['Disputes', stat('pendingReports')],
                ['Pending reviews', stat('pendingReviews')],
                ['Unread alerts', stat('activeAlerts')],
              ].map(([label, value]) => <div key={label} className="p-3 rounded-xl bg-slate-50 border border-slate-200"><div className="text-[10px] uppercase font-bold text-slate-500">{label}</div><div className="text-xl font-black text-[#1E3063] mt-1">{value}</div></div>)}
            </div>
          </Card>
        </>
      )}

      {module === 'users' && (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredUsers.map((u) => <TableRow key={u._id}>
                <TableCell><div className="font-bold">{u.name || 'Unnamed user'}</div><div className="text-xs text-slate-500">{u.email || 'No email returned'}</div></TableCell>
                <TableCell><Badge variant="neutral">{u.role || 'unknown'}</Badge></TableCell>
                <TableCell>{u.isBanned ? <Badge variant="warning">Banned</Badge> : <Badge variant="success">Active</Badge>}</TableCell>
                <TableCell><Button size="sm" variant="outline" disabled={busyId === u._id} onClick={() => void toggleBan(u)}><Ban className="w-3.5 h-3.5" /> {u.isBanned ? 'Unban' : 'Ban'}</Button></TableCell>
              </TableRow>)}
              {!filteredUsers.length && <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">No live users returned by the server.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>
      )}

      {module === 'cars' && (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Vehicle</TableHead><TableHead>Status</TableHead><TableHead>Price</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredCars.map((c) => <TableRow key={c._id}>
                <TableCell><div className="font-bold">{c.title || 'Untitled vehicle'}</div><div className="text-xs text-slate-500">{c._id}</div></TableCell>
                <TableCell><Badge variant="neutral">{c.status || 'unknown'}</Badge></TableCell>
                <TableCell>{typeof c.price === 'number' ? `Ksh ${c.price.toLocaleString()}` : 'Not provided'}</TableCell>
                <TableCell><div className="flex gap-2"><Button size="sm" variant="outline" disabled={busyId === c._id} onClick={() => void verifyCar(c)}><FileCheck className="w-3.5 h-3.5" /> Verify</Button>{onQuickViewVehicle && <Button size="sm" variant="outline" onClick={() => { const v = vehicles.find((x) => x.id === c._id); if (v) onQuickViewVehicle(v); }}>View</Button>}</div></TableCell>
              </TableRow>)}
              {!filteredCars.length && <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">No live vehicles returned by the server.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>
      )}

      {module === 'communications' && <AdminCommunications />}

      {module === 'audit' && (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Action</TableHead><TableHead>Module</TableHead><TableHead>Target</TableHead><TableHead>Actor</TableHead></TableRow></TableHeader>
            <TableBody>
              {auditLogs.map((log, i) => <TableRow key={log._id || log.id || i}>
                <TableCell className="text-xs">{log.createdAt || log.timestamp || 'Not provided'}</TableCell>
                <TableCell className="font-semibold">{log.action || 'Unknown action'}</TableCell>
                <TableCell>{log.module || '—'}</TableCell>
                <TableCell className="font-mono text-xs">{log.targetId || '—'}</TableCell>
                <TableCell>{log.actor?.email || log.user?.email || 'Server record'}</TableCell>
              </TableRow>)}
              {!auditLogs.length && <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">No live audit records returned by the server.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default AdminView;
