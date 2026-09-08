import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../api/api';

const SEVERITY_COLORS = {
  critical: { bg: 'rgba(239,68,68,0.1)', color: 'var(--red)' },
  warning: { bg: 'rgba(37, 99, 235,0.1)', color: 'var(--gold)' },
  info: { bg: 'rgba(59,130,246,0.08)', color: '#3B82F6' },
};

const ACTION_COLORS = {
  vehicle_created: 'var(--green)',
  vehicle_edited: 'var(--gold)',
  vehicle_deleted: 'var(--red)',
  auction_created: 'var(--blue)',
  auction_bid_placed: 'var(--purple)',
  auction_ended: 'var(--orange)',
  escrow_created: 'var(--teal)',
  escrow_released: 'var(--green)',
  escrow_refunded: 'var(--red)',
  dealer_verification_submitted: 'var(--blue)',
  dealer_verification_approved: 'var(--green)',
  user_created: 'var(--blue)',
  role_changed: 'var(--purple)',
  admin_login: 'var(--gold)',
  admin_logout: 'var(--gray)',
  dispute_created: 'var(--red)',
  dispute_resolved: 'var(--green)',
  payment_initiated: 'var(--blue)',
  payment_completed: 'var(--green)',
  payment_refunded: 'var(--red)',
};

export default function AdminSecurityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [targetModelFilter, setTargetModelFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [showStatistics, setShowStatistics] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 30 };
    if (filter) params.action = filter;
    if (severityFilter) params.severity = severityFilter;
    if (targetModelFilter) params.targetModel = targetModelFilter;
    adminAPI.getAuditLogs(params)
      .then(d => {
        setLogs(d.data || []);
        setPagination(d.pagination);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // filter is applied manually (Enter key / Apply button), not auto-triggered on change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, severityFilter, targetModelFilter]);

  const fetchStatistics = () => {
    adminAPI.getAuditLogStatistics({ days: 30 })
      .then(d => {
        setStatistics(d.statistics);
      })
      .catch(() => {});
  };

  const handleExport = async (format = 'json') => {
    setExporting(true);
    try {
      const params = { format };
      if (filter) params.action = filter;
      if (severityFilter) params.severity = severityFilter;
      if (targetModelFilter) params.targetModel = targetModelFilter;

      const response = await adminAPI.exportAuditLogs(params);

      if (format === 'csv') {
        const blob = new Blob([response], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${Date.now()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${Date.now()}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { if (showStatistics) fetchStatistics(); }, [showStatistics]);

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 1200 }}>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>📋 Immutable Audit Trail</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
              Enterprise-grade audit logging — records cannot be altered or deleted
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setShowStatistics(!showStatistics)}
            >
              {showStatistics ? 'Hide Statistics' : 'Show Statistics'}
            </button>
            <button
              className="btn btn-sm btn-gold"
              onClick={() => handleExport('json')}
              disabled={exporting}
            >
              {exporting ? 'Exporting...' : 'Export JSON'}
            </button>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => handleExport('csv')}
              disabled={exporting}
            >
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        </div>

        {showStatistics && statistics && (
          <div className="card" style={{ marginBottom: 24, padding: 16 }}>
            <h3 style={{ fontSize: 14, marginBottom: 12 }}>📊 Audit Statistics (Last 30 Days)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Logs</div>
                <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--gold)' }}>{statistics.totalLogs}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Top Actions</div>
                <div style={{ fontSize: 12 }}>
                  {statistics.actionCounts?.slice(0, 3).map((a, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{a._id}</span>
                      <span style={{ fontWeight: 600 }}>{a.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Severity Distribution</div>
                <div style={{ fontSize: 12 }}>
                  {statistics.severityCounts?.map((s, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: SEVERITY_COLORS[s._id]?.color || 'var(--text-muted)' }}>{s._id}</span>
                      <span style={{ fontWeight: 600 }}>{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Target Models</div>
                <div style={{ fontSize: 12 }}>
                  {statistics.targetModelCounts?.slice(0, 3).map((t, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{t._id}</span>
                      <span style={{ fontWeight: 600 }}>{t.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="card" style={{ marginBottom: 24, padding: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <select
              className="input"
              style={{ width: 140, fontSize: 12, padding: '6px 10px' }}
              value={severityFilter}
              onChange={e => { setSeverityFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Severity</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
            <select
              className="input"
              style={{ width: 140, fontSize: 12, padding: '6px 10px' }}
              value={targetModelFilter}
              onChange={e => { setTargetModelFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Models</option>
              <option value="User">User</option>
              <option value="Car">Car</option>
              <option value="Auction">Auction</option>
              <option value="Escrow">Escrow</option>
              <option value="Payment">Payment</option>
              <option value="Bid">Bid</option>
            </select>
            <input
              className="input"
              style={{ width: 200, fontSize: 12, padding: '6px 10px' }}
              placeholder="Search by action..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setPage(1); fetchLogs(); } }}
            />
            <button className="btn btn-sm btn-gold" onClick={() => { setPage(1); fetchLogs(); }}>
              Search
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {logs.length === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No audit logs found
                </div>
              ) : logs.map(log => {
                const sev = SEVERITY_COLORS[log.severity] || SEVERITY_COLORS.info;
                const actionColor = ACTION_COLORS[log.action] || 'var(--text-muted)';
                return (
                  <div key={log._id} className="card" style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                        background: sev.bg, color: sev.color, textTransform: 'uppercase',
                      }}>
                        {log.severity}
                      </span>
                      <code style={{ fontSize: 12, color: actionColor, fontFamily: 'monospace' }}>
                        {log.action}
                      </code>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {log.actorName || log.actorEmail || 'System'} ({log.actorRole || '—'})
                      </span>
                      {log.targetModel && (
                        <span style={{ fontSize: 11, color: 'var(--text-dim)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>
                          {log.targetModel}
                        </span>
                      )}
                      {log.targetName && (
                        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                          → {log.targetName}
                        </span>
                      )}
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-dim)' }}>
                        {new Date(log.createdAt).toLocaleString('en-KE')}
                      </span>
                    </div>
                    {(log.oldValue || log.newValue || log.changes?.length > 0) && (
                      <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                        {log.changes?.length > 0 ? (
                          <div style={{ fontSize: 11 }}>
                            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Changes:</div>
                            {log.changes.map((change, i) => (
                              <div key={i} style={{ marginBottom: 2 }}>
                                <span style={{ color: 'var(--gold)' }}>{change.field}:</span>
                                <span style={{ color: 'var(--red)', marginLeft: 4 }}>{JSON.stringify(change.oldValue)}</span>
                                <span style={{ color: 'var(--text-dim)', margin: '0 4px' }}>→</span>
                                <span style={{ color: 'var(--green)' }}>{JSON.stringify(change.newValue)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <pre style={{ fontSize: 11, color: 'var(--text-dim)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {JSON.stringify({ oldValue: log.oldValue, newValue: log.newValue }, null, 1)}
                          </pre>
                        )}
                      </div>
                    )}
                    {log.ipAddress && (
                      <div style={{ marginTop: 4, fontSize: 10, color: 'var(--text-dim)' }}>
                        IP: {log.ipAddress} {log.userAgent && `• ${log.userAgent.substring(0, 50)}...`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {pagination && pagination.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                <button
                  className="btn btn-sm btn-outline"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  ← Prev
                </button>
                <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-muted)' }}>
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  className="btn btn-sm btn-outline"
                  disabled={page >= pagination.pages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
