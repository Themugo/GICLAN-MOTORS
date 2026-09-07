import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { dealerAPI, carsAPI } from '../../../api/api';
import { Plus, Download, Copy, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { StatusBadge } from './DashboardWidgets';

const STATUS_OPTS = ['', 'active', 'sold', 'pending', 'rejected'];
const PAGE_SIZES = [25, 50, 100];

export default function DealerListingsTab({ cars: initialCars, totalCars: initialTotal, setCars, toast }) {
  const [listings, setListings] = useState(initialCars || []);
  const [total, setTotal] = useState(initialTotal || 0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchListings = useCallback(async (p, ps, s, sf) => {
    setLoading(true);
    try {
      const params = { page: p, limit: ps };
      if (s) params.search = s;
      if (sf) params.status = sf;
      const res = await dealerAPI.cars(params);
      const data = res.cars || res.data || [];
      setListings(data);
      setTotal(res.pagination?.total || data.length);
      setTotalPages(res.pagination?.pages || 1);
    } catch {
      toast('Failed to load listings', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchListings(page, pageSize, search, statusFilter);
  }, [page, pageSize, search, statusFilter, fetchListings]);

  useEffect(() => {
    setListings(initialCars || []);
    setTotal(initialTotal || 0);
  }, [initialCars, initialTotal]);

  const handleDelete = async (carId) => {
    if (!confirm('Delete this listing permanently?')) return;
    try {
      await carsAPI.remove(carId);
      toast('Listing deleted', 'info');
      fetchListings(page, pageSize, search, statusFilter);
      if (setCars) setCars(p => p.filter(c => c._id !== carId));
    } catch {
      toast('Delete failed', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} listings permanently?`)) return;
    try {
      const res = await dealerAPI.bulkDelete(selectedIds);
      toast(`Deleted ${res.deletedCount || selectedIds.length} listing(s)`, 'info');
      setSelectedIds([]);
      fetchListings(page, pageSize, search, statusFilter);
    } catch {
      toast('Bulk delete failed', 'error');
    }
  };

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleStatusFilter = (val) => {
    setStatusFilter(val);
    setPage(1);
  };

  const exportCSV = () => {
    const csv = [['Title','Brand','Model','Year','Price','Mileage','Views','Status'],
      ...listings.map(c => [c.title, c.brand, c.model, c.year, c.price, c.mileage, c.views, c.status])
    ].map(r => r.join(',')).join('\n');
    const b = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = 'listings.csv';
    a.click();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.4rem', color: '#fff', margin: 0 }}>{total} Listings</h2>
          <select value={sortField} onChange={e => setSortField(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--card)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 11, outline: 'none' }}>
            <option value="createdAt">Newest</option>
            <option value="price">Price</option>
            <option value="year">Year</option>
            <option value="views">Views</option>
          </select>
          <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')} style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--card)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 11, cursor: 'pointer' }}>
            {sortDir === 'desc' ? '↓ Desc' : '↑ Asc'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={exportCSV} style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={13} /> CSV
          </button>
          <Link to="/dealer/add-car" style={{ padding: '10px 20px', background: 'var(--gold)', color: '#000', borderRadius: 10, fontSize: 12, fontWeight: 900, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={13} /> Add Listing
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)' }} />
            <input className="input" placeholder="Search by title, brand, model, VIN..." value={search} onChange={e => handleSearch(e.target.value)}
              style={{ paddingLeft: 30, fontSize: 12, height: 34 }} />
            {search && <X size={13} onClick={() => handleSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'rgba(255,255,255,0.25)' }} />}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {STATUS_OPTS.map(s => (
              <button key={s} onClick={() => handleStatusFilter(s)}
                style={{ padding: '5px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                  background: statusFilter === s ? 'var(--gold)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${statusFilter === s ? 'var(--gold)' : 'rgba(255,255,255,0.08)'}`,
                  color: statusFilter === s ? '#000' : 'rgba(255,255,255,0.5)', }}>
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
          Page {page} of {totalPages} ({total} total)
        </span>
      </div>

      <div style={{
        maxHeight: selectedIds.length > 0 ? 60 : 0,
        opacity: selectedIds.length > 0 ? 1 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.3s ease, opacity 0.3s ease',
        marginBottom: selectedIds.length > 0 ? 12 : 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'rgba(37, 99, 235,0.06)', border: '1px solid rgba(37, 99, 235,0.15)', borderRadius: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600 }}>{selectedIds.length} selected</span>
          <button onClick={() => { dealerAPI.bulkStatus({ ids: selectedIds, status: 'active' }).then(() => { toast('Marked active', 'success'); setSelectedIds([]); fetchListings(page, pageSize, search, statusFilter); }).catch(() => toast('Failed', 'error')); }} style={{ padding: '5px 12px', borderRadius: 6, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', fontSize: 11, cursor: 'pointer' }}>Mark Active</button>
          <button onClick={() => { dealerAPI.bulkStatus({ ids: selectedIds, status: 'sold' }).then(() => { toast('Marked sold', 'success'); setSelectedIds([]); fetchListings(page, pageSize, search, statusFilter); }).catch(() => toast('Failed', 'error')); }} style={{ padding: '5px 12px', borderRadius: 6, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', fontSize: 11, cursor: 'pointer' }}>Mark Sold</button>
            <button onClick={() => { dealerAPI.bulkStatus({ ids: selectedIds, status: 'pending' }).then(() => { toast('Marked pending', 'success'); setSelectedIds([]); fetchListings(page, pageSize, search, statusFilter); }).catch(() => toast('Failed', 'error')); }} style={{ padding: '5px 12px', borderRadius: 6, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', color: '#f97316', fontSize: 11, cursor: 'pointer' }}>Mark Pending</button>
            <button onClick={handleBulkDelete} style={{ padding: '5px 12px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>Delete</button>
          <button onClick={() => setSelectedIds([])} style={{ padding: '5px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', marginLeft: 'auto' }}>Clear</button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {listings.map(car => {
            const img = car.images?.[0]?.url || car.images?.[0] || car.image;
            const isSelected = selectedIds.includes(car._id);
            const isLiveAuction = car.auctionStatus === 'live';
            const displayStatus = isLiveAuction ? 'live' : (car.status || 'draft');
            return (
              <div key={car._id} style={{ background: 'var(--card)', border: `1px solid ${isSelected ? 'rgba(37, 99, 235,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 14, padding: '12px 16px', display: 'grid', gridTemplateColumns: '20px 64px 1fr 120px 90px auto', alignItems: 'center', gap: 12, transition: 'border-color 0.15s' }}>
                <input type="checkbox" checked={isSelected} onChange={() => setSelectedIds(p => p.includes(car._id) ? p.filter(id => id !== car._id) : [...p, car._id])} style={{ accentColor: 'var(--gold)', width: 16, height: 16, flexShrink: 0 }} />
                {img ? <img src={img} alt={car.title} loading="lazy" decoding="async" style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 10, aspectRatio: '4/3', flexShrink: 0 }} />
                  : <div style={{ width: 64, height: 48, borderRadius: 10, background: 'rgba(255,255,255,0.03)', flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{car.title}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{car.year || '—'} · {car.mileage?.toLocaleString() || '—'} km</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>👁 {car.views || 0} views</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginRight: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>KES {Number(car.price||0).toLocaleString()}</div>
                </div>
                <StatusBadge status={displayStatus} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <Link to={`/cars/${car._id}`} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>Preview</Link>
                  <Link to={`/dealer/edit/${car._id}`} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(37, 99, 235,0.1)', border: '1px solid rgba(37, 99, 235,0.2)', color: 'var(--gold)', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>Edit</Link>
                  <div style={{ position: 'relative', display: 'flex', gap: 2 }}>
                    <button
                      onClick={async () => {
                        try { await dealerAPI.markSold(car._id, { buyerName: prompt('Buyer name:') || 'Unknown', salePrice: Number(prompt('Sale price:') || car.price) }); toast('Marked as sold', 'success'); fetchListings(page, pageSize, search, statusFilter); } catch { toast('Failed', 'error'); }
                      }}
                      title="Mark Sold"
                      style={{ padding: '6px 8px', borderRadius: 6, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', color: '#3b82f6', fontSize: 11, cursor: 'pointer' }}
                    >
                      <span role="img" aria-label="sold">💰</span>
                    </button>
                    <button
                      onClick={async () => {
                        try { await dealerAPI.duplicate(car._id); toast('Duplicated', 'success'); fetchListings(page, pageSize, search, statusFilter); } catch { toast('Failed', 'error'); }
                      }}
                      title="Duplicate"
                      style={{ padding: '6px 8px', borderRadius: 6, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)', color: '#8b5cf6', fontSize: 11, cursor: 'pointer' }}
                    >
                      <span role="img" aria-label="duplicate">📋</span>
                    </button>
                    <button
                      onClick={() => { navigator.clipboard.writeText(window.location.origin + '/cars/' + car._id); toast('Link copied', 'success'); }}
                      title="Copy Link"
                      style={{ padding: '6px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer' }}
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                  <button onClick={() => handleDelete(car._id)} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: 'rgba(239,68,68,0.8)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                  <button
                    onClick={async () => {
                      try { await dealerAPI.toggleWholesale(car._id, !car.wholesale); toast(car.wholesale ? 'Removed from trade' : 'Listed for dealer trade', 'success'); fetchListings(page, pageSize, search, statusFilter); } catch { toast('Failed', 'error'); }
                    }}
                    title={car.wholesale ? 'Dealer trade listing' : 'List for dealer trade'}
                    style={{ padding: '6px 8px', borderRadius: 6, background: car.wholesale ? 'rgba(168,85,247,0.15)' : 'rgba(168,85,247,0.06)', border: `1px solid ${car.wholesale ? 'rgba(168,85,247,0.3)' : 'rgba(168,85,247,0.12)'}`, color: car.wholesale ? '#a855f7' : 'rgba(168,85,247,0.5)', fontSize: 11, cursor: 'pointer' }}
                  >
                    <span role="img" aria-label="trade">{car.wholesale ? '🏪' : '📦'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Per page:</span>
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            style={{ padding: '5px 8px', borderRadius: 6, background: 'var(--card)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 11, outline: 'none' }}>
            {PAGE_SIZES.map(ps => <option key={ps} value={ps}>{ps}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
            style={{ padding: '6px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: page <= 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', fontSize: 11, cursor: page <= 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ChevronLeft size={12} /> Prev
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 3, totalPages - 6));
            const p = start + i;
            if (p > totalPages) return null;
            return (
              <button key={p} onClick={() => setPage(p)}
                style={{ width: 32, height: 32, borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: p === page ? 'var(--gold)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${p === page ? 'var(--gold)' : 'rgba(255,255,255,0.08)'}`,
                  color: p === page ? '#000' : 'rgba(255,255,255,0.5)' }}>
                {p}
              </button>
            );
          })}
          <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            style={{ padding: '6px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: page >= totalPages ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', fontSize: 11, cursor: page >= totalPages ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            Next <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}