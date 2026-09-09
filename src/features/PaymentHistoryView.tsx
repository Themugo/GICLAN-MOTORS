import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Clock, CreditCard, RefreshCw, XCircle } from 'lucide-react';
import { paymentsAPI } from '../api/api';
import { Button, Card, PageHeader } from '../components/ui';

type PaymentStatus = 'pending' | 'success' | 'failed' | 'cancelled';
type PaymentRecord = { id: string; amount?: number; type?: string; status?: PaymentStatus; mpesaReceipt?: string; checkoutRequestId?: string; createdAt?: string; car?: { title?: string; brand?: string; model?: string; year?: number } | null };
type PaymentResponse = { payments?: PaymentRecord[]; pagination?: { page?: number; limit?: number; total?: number; pages?: number } };
const FILTERS: Array<{ label: string; value: PaymentStatus | '' }> = [{ label: 'All', value: '' }, { label: 'Completed', value: 'success' }, { label: 'Pending', value: 'pending' }, { label: 'Failed', value: 'failed' }];
const money = (amount?: number) => `KES ${Number(amount || 0).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;
const statusMeta = (status?: PaymentStatus) => status === 'success' ? { label: 'Completed', Icon: CheckCircle2, className: 'text-emerald-700 bg-emerald-50' } : status === 'pending' ? { label: 'Pending', Icon: Clock, className: 'text-amber-700 bg-amber-50' } : status === 'cancelled' ? { label: 'Cancelled', Icon: XCircle, className: 'text-slate-600 bg-slate-100' } : { label: 'Failed', Icon: AlertCircle, className: 'text-rose-700 bg-rose-50' };

export default function PaymentHistoryView() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [filter, setFilter] = useState<PaymentStatus | ''>('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async (nextPage = page, nextFilter = filter, background = false) => {
    if (background) setRefreshing(true); else setLoading(true);
    setError(null);
    try { const result = (await paymentsAPI.myPayments({ page: nextPage, limit: 10, ...(nextFilter ? { status: nextFilter } : {}) })) as PaymentResponse; setPayments(result.payments || []); setTotal(result.pagination?.total || 0); setPages(Math.max(1, result.pagination?.pages || 1)); }
    catch (err: any) { setError(err?.message || 'Could not load your payment history.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [filter, page]);
  useEffect(() => { void load(page, filter); }, [load, page, filter]);
  const pending = useMemo(() => payments.filter((p) => p.status === 'pending'), [payments]);
  const completed = useMemo(() => payments.filter((p) => p.status === 'success'), [payments]);
  const completedAmount = useMemo(() => completed.reduce((sum, p) => sum + Number(p.amount || 0), 0), [completed]);
  const refreshPending = async () => {
    await Promise.all(pending.filter((p) => p.checkoutRequestId).map(async (p) => { try { await paymentsAPI.status(p.checkoutRequestId as string); } catch {} }));
    void load(page, filter, true);
  };
  return <div className="space-y-6">
    <PageHeader badgeText="Payments" title="Payment History" description="Your real KAYAD payment records and M-Pesa transaction status." />
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><Card className="p-5"><p className="text-xs font-semibold text-slate-500">Successful on this page</p><p className="text-2xl font-black text-[#1E3063] mt-1">{money(completedAmount)}</p></Card><Card className="p-5"><p className="text-xs font-semibold text-slate-500">Completed records</p><p className="text-2xl font-black text-[#1E3063] mt-1">{completed.length}</p></Card><Card className="p-5"><p className="text-xs font-semibold text-slate-500">Pending records</p><p className="text-2xl font-black text-[#1E3063] mt-1">{pending.length}</p></Card></div>
    <Card className="overflow-hidden"><div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{FILTERS.map((item) => <button key={item.value || 'all'} onClick={() => { setPage(1); setFilter(item.value); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${filter === item.value ? 'bg-[#1E3063] text-white' : 'bg-slate-100 text-slate-600'}`}>{item.label}</button>)}</div><Button variant="outline" onClick={refreshPending} disabled={refreshing || loading}><RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Refresh status</Button></div>
      {loading ? <div className="p-10 text-center text-sm text-slate-500">Loading your payment history…</div> : error ? <div className="p-10 text-center"><AlertCircle className="w-8 h-8 mx-auto text-rose-500 mb-2" /><p className="text-sm text-slate-600">{error}</p><Button className="mt-4" onClick={() => void load(page, filter)}>Try again</Button></div> : payments.length === 0 ? <div className="p-12 text-center"><CreditCard className="w-9 h-9 mx-auto text-slate-300 mb-3" /><p className="font-bold text-slate-700">No payment records found</p><p className="text-sm text-slate-500 mt-1">Completed and pending payments will appear here after the backend records them.</p></div> : <div className="divide-y divide-slate-100">{payments.map((payment) => { const meta = statusMeta(payment.status); const vehicle = payment.car?.title || [payment.car?.brand, payment.car?.model, payment.car?.year].filter(Boolean).join(' ') || 'Vehicle payment'; return <div key={payment.id} className="p-4 flex flex-col md:flex-row md:items-center gap-4 justify-between"><div className="min-w-0"><p className="font-bold text-slate-800 truncate">{vehicle}</p><p className="text-xs text-slate-500 mt-1">{payment.type || 'payment'} · {payment.createdAt ? new Date(payment.createdAt).toLocaleString() : 'Date unavailable'}</p>{payment.mpesaReceipt && <p className="text-xs text-slate-500 mt-1">M-Pesa receipt: <span className="font-semibold">{payment.mpesaReceipt}</span></p>}</div><div className="text-right"><p className="font-black text-[#1E3063]">{money(payment.amount)}</p><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${meta.className}`}><meta.Icon className="w-3 h-3" />{meta.label}</span></div></div>; })}</div>}
      {!loading && !error && payments.length > 0 && <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500"><span>{total} record{total === 1 ? '' : 's'}</span><div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => setPage((v) => v - 1)} className="p-2 rounded-lg border disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button><span>Page {page} of {pages}</span><button disabled={page >= pages} onClick={() => setPage((v) => v + 1)} className="p-2 rounded-lg border disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button></div></div>}
    </Card>
  </div>;
}
