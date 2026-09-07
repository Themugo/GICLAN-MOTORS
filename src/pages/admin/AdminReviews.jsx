import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';

export default function AdminReviews() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionId, setActionId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminAPI.reviews({ page, limit: 20 });
      const list = data.reviews || data.data || [];
      if (search) {
        const q = search.toLowerCase();
        setReviews(list.filter(r =>
          r.user?.name?.toLowerCase().includes(q) ||
          r.user?.email?.toLowerCase().includes(q) ||
          r.dealer?.name?.toLowerCase().includes(q) ||
          r.comment?.toLowerCase().includes(q)
        ));
      } else {
        setReviews(list);
      }
      setTotal(data.pagination?.total || list.length);
    } catch { toast('Failed to load reviews', 'error'); }
    finally { setLoading(false); }
  }, [page, search, toast]);

  useEffect(() => { load(); }, [load]);

  const handleStatus = async (id, status) => {
    setActionId(id);
    try { await adminAPI.reviewStatus(id, status); toast(`Review ${status}`, 'success'); load(); }
    catch (err) { toast(err.response?.data?.message || 'Moderation failed', 'error'); }
    finally { setActionId(null); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this review permanently? Cannot be undone.')) return;
    setActionId(id);
    try {
      await adminAPI.deleteReview(id);
      toast('🗑️ Review deleted', 'success');
      load();
      if (selected?._id === id) setSelected(null);
    } catch (err) {
      toast(err.response?.data?.message || 'Delete failed', 'error');
    } finally { setActionId(null); }
  };

  const pages = Math.ceil(total / 20);

  return (
    <div style={{ padding: '32px', background: '#F8FAFC', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900, fontStyle: 'italic' }}>⭐ Review Moderation</h2>
          <p style={{ color: 'rgba(15, 23, 42, 0.35)', fontSize: 13, marginTop: 6 }}>Manage and moderate dealer reviews across the platform</p>
        </div>

        <input
          placeholder="Search reviews by user, dealer, or comment…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{
            width: '100%', maxWidth: 400, background: 'rgba(15, 23, 42, 0.04)', border: '1px solid rgba(15, 23, 42, 0.1)',
            borderRadius: 8, padding: '10px 14px', color: '#0F172A', fontSize: 13, outline: 'none', marginBottom: 24,
          }}
        />

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>
        ) : reviews.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <div className="empty-icon">⭐</div>
            <h3>No reviews found</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8 }}>{search ? 'No reviews match your search' : 'No reviews have been submitted yet'}</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gap: 12 }}>
              {reviews.map(r => (
                <div key={r._id} style={{ background: '#FFFFFF', border: '1px solid rgba(15, 23, 42, 0.07)', borderRadius: 14, padding: '18px 22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ fontSize: 16 }}>{'⭐'.repeat(Math.min(r.rating || 0, 5))}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{r.rating}/5</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(15, 23, 42, 0.4)' }}>
                        <span style={{ color: 'rgba(15, 23, 42, 0.6)' }}>{r.user?.name || 'Anonymous'}</span>
                        {' · '}
                        <span style={{ color: 'var(--gold)' }}>{r.dealer?.name || 'Unknown Dealer'}</span>
                        {' · '}
                        {new Date(r.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: r.status === 'approved' ? '#15803D' : r.status === 'rejected' ? '#B91C1C' : '#A16207' }}>{r.status || 'pending'}</span>
                      {r.status !== 'approved' && <button className="btn btn-outline btn-sm" disabled={actionId === r._id} onClick={() => handleStatus(r._id, 'approved')}>Approve</button>}
                      {r.status !== 'rejected' && <button className="btn btn-outline btn-sm" disabled={actionId === r._id} onClick={() => handleStatus(r._id, 'rejected')}>Reject</button>}
                      <button className="btn btn-outline btn-sm" style={{ fontSize: 11, color: 'var(--red)', borderColor: 'rgba(239,68,68,0.3)' }}
                        disabled={actionId === r._id} onClick={() => handleDelete(r._id)}>
                        {actionId === r._id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                  {r.comment && (
                    <div style={{ fontSize: 13, color: 'rgba(15, 23, 42, 0.65)', lineHeight: 1.5, marginBottom: 8, maxWidth: 600 }}>
                      "{r.comment}"
                    </div>
                  )}
                  {r._id === selected?._id && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(15, 23, 42, 0.06)', fontSize: 11, color: 'rgba(15, 23, 42, 0.35)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <div>Review ID: {r._id}</div>
                      <div>User ID: {r.user?._id || '—'}</div>
                      <div>Dealer ID: {r.dealer?._id || '—'}</div>
                      <div>User Email: {r.user?.email || '—'}</div>
                    </div>
                  )}
                  <button className="btn btn-outline btn-sm" style={{ fontSize: 10, marginTop: 6 }} onClick={() => setSelected(selected?._id === r._id ? null : r)}>
                    {selected?._id === r._id ? 'Less info' : 'More info'}
                  </button>
                </div>
              ))}
            </div>

            {pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24, flexWrap: 'wrap' }}>
                {Array.from({ length: Math.min(pages, 10) }, (_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)}
                    className={`btn btn-sm ${page === i + 1 ? 'btn-gold' : 'btn-outline'}`}
                    style={{ fontSize: 11 }}>{i + 1}</button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
