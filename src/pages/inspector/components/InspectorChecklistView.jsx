import { AlertTriangle, ChevronRight, FileText, Save, Keyboard } from 'lucide-react';
import { useEffect, useState } from 'react';
import { timeAgo } from '../../../utils/helpers';

export default function InspectorChecklistView({ activeTask, setActiveTask, checklist, setChecklist, notes, setNotes, condition, setCondition, collapsedCats, setCollapsedCats, searchQuery, setSearchQuery, handleSubmit, CATEGORIES }) {
  const total = checklist.length;
  const passed = checklist.filter(c => c.passed === true).length;
  const failed = checklist.filter(c => c.passed === false).length;
  const untested = total - passed - failed;
  const filtered = searchQuery
    ? checklist.filter(c => c.item.toLowerCase().includes(searchQuery.toLowerCase()) || c.category.toLowerCase().includes(searchQuery.toLowerCase()))
    : checklist;
  const [lastSaved, setLastSaved] = useState(null);
  const [_showKeyboardHint, setShowKeyboardHint] = useState(false);

  // Auto-save functionality
  useEffect(() => {
    const timer = setTimeout(() => {
      const data = { checklist, notes, condition };
      localStorage.setItem(`inspection_${activeTask._id}`, JSON.stringify(data));
      setLastSaved(new Date());
    }, 2000);
    return () => clearTimeout(timer);
  }, [checklist, notes, condition, activeTask._id]);

  // Load saved state on mount
  useEffect(() => {
    const saved = localStorage.getItem(`inspection_${activeTask._id}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.checklist && data.checklist.length === checklist.length) {
          setChecklist(data.checklist);
        }
        if (data.notes) setNotes(data.notes);
        if (data.condition) setCondition(data.condition);
        setLastSaved(new Date(data.timestamp));
      } catch (e) {
        console.error('Failed to load saved state:', e);
      }
    }
    // Show keyboard hint on first visit
    const hintShown = sessionStorage.getItem('keyboard_hint_shown');
    if (!hintShown) {
      setShowKeyboardHint(true);
      setTimeout(() => {
        setShowKeyboardHint(false);
        sessionStorage.setItem('keyboard_hint_shown', 'true');
      }, 5000);
    }
    // checklist.length is intentionally excluded: this effect should only restore a
    // draft when switching tasks (activeTask._id), not whenever checklist mutates,
    // to avoid clobbering in-progress edits with a stale localStorage snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTask._id, setChecklist, setNotes, setCondition]);

  const toggleCheck = (idx) => {
    setChecklist(prev => prev.map((c, i) => i === idx ? { ...c, passed: c.passed === true ? false : c.passed === false ? null : true } : c));
  };

  const toggleCategory = (cat) => {
    setCollapsedCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit]);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{
        background: 'linear-gradient(180deg, rgba(37, 99, 235,0.04) 0%, transparent 100%)',
        borderBottom: '1px solid var(--border)', padding: '24px 0 20px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
                150-Point Inspection
              </span>
              <button onClick={() => setActiveTask(null)} style={{
                padding: '4px 12px', borderRadius: 6, background: 'rgba(15, 23, 42, 0.05)', border: '1px solid rgba(15, 23, 42, 0.1)',
                color: 'rgba(15, 23, 42, 0.5)', fontSize: 10, cursor: 'pointer', fontWeight: 600,
              }}>← Back to Tasks</button>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'rgba(15, 23, 42, 0.35)' }}>
                <span style={{ color: '#22c55e', fontWeight: 700 }}>{passed}</span> passed · <span style={{ color: failed > 0 ? '#ef4444' : 'rgba(15, 23, 42, 0.35)', fontWeight: 700 }}>{failed}</span> failed · <span style={{ color: 'rgba(15, 23, 42, 0.2)' }}>{untested}</span> pending
              </span>
              {lastSaved && (
                <span style={{ fontSize: 9, color: 'rgba(15, 23, 42, 0.25)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Save size={10} /> Saved {timeAgo(lastSaved)}
                </span>
              )}
              <div style={{ width: 100, height: 6, borderRadius: 3, background: 'rgba(15, 23, 42, 0.06)', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${(passed / total) * 100}%`, height: '100%', background: '#22c55e', transition: 'width 0.3s' }} />
                <div style={{ width: `${(failed / total) * 100}%`, height: '100%', background: '#ef4444', transition: 'width 0.3s' }} />
              </div>
              <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                {Math.round((passed / total) * 100)}%
              </span>
            </div>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.2rem,2vw,1.6rem)', color: '#0F172A', margin: 0 }}>
            {activeTask.car?.title || 'Vehicle Inspection'}
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 32px 40px' }}>
        <div style={{ marginBottom: 16 }}>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search inspection items..."
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              background: 'rgba(15, 23, 42, 0.03)', border: '1px solid rgba(15, 23, 42, 0.1)',
              color: '#0F172A', fontSize: 12, outline: 'none',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(37, 99, 235,0.3)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.1)'; }} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(15, 23, 42, 0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 4 }}>Condition:</span>
          {['excellent', 'good', 'fair', 'poor'].map(c => (
            <button key={c} onClick={() => setCondition(c)} style={{
              padding: '6px 16px', borderRadius: 8, border: '1px solid',
              background: condition === c ? 'rgba(37, 99, 235,0.15)' : 'transparent',
              borderColor: condition === c ? 'rgba(37, 99, 235,0.3)' : 'rgba(15, 23, 42, 0.1)',
              color: condition === c ? 'var(--gold)' : 'rgba(15, 23, 42, 0.4)',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize',
              transition: 'all 0.15s',
            }}>
              {condition === c ? '✓ ' : ''}{c}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => {
            const items = checklist.filter(c => c.category === cat);
            const catPassed = items.filter(c => c.passed === true).length;
            const catFailed = items.filter(c => c.passed === false).length;
            const allDone = catPassed + catFailed === items.length;
            return (
              <button key={cat} onClick={() => toggleCategory(cat)}
                style={{
                  padding: '4px 10px', borderRadius: 6, border: '1px solid',
                  background: allDone ? 'rgba(34,197,94,0.08)' : 'rgba(15, 23, 42, 0.03)',
                  borderColor: allDone ? 'rgba(34,197,94,0.15)' : 'rgba(15, 23, 42, 0.08)',
                  color: allDone ? 'rgba(15, 23, 42, 0.5)' : 'rgba(15, 23, 42, 0.35)',
                  fontSize: 9, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                {cat} {allDone ? `✓` : `(${catPassed + catFailed}/${items.length})`}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {CATEGORIES.map(cat => {
            const items = (searchQuery ? filtered : checklist).filter(c => c.category === cat);
            if (items.length === 0) return null;
            const catPassed = items.filter(c => c.passed === true).length;
            const catFailed = items.filter(c => c.passed === false).length;
            const isCollapsed = collapsedCats.includes(cat);
            return (
              <div role="presentation" key={cat} style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 12, overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(37, 99, 235,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <div onClick={() => toggleCategory(cat)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCategory(cat); } }}
                  role="button" tabIndex={0} aria-expanded={!isCollapsed} aria-label={`${cat} category`}
                  style={{
                    padding: '12px 16px', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', cursor: 'pointer', userSelect: 'none',
                    borderBottom: isCollapsed ? 'none' : '1px solid rgba(15, 23, 42, 0.04)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{cat}</span>
                    {catFailed > 0 && <AlertTriangle size={12} style={{ color: '#ef4444' }} />}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, color: 'rgba(15, 23, 42, 0.35)', display: 'flex', gap: 6 }}>
                      <span style={{ color: '#22c55e' }}>{catPassed}✓</span>
                      {catFailed > 0 && <span style={{ color: '#ef4444' }}>{catFailed}✗</span>}
                    </span>
                    <ChevronRight size={12} style={{
                      color: 'rgba(15, 23, 42, 0.2)',
                      transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                      transition: 'transform 0.2s',
                    }} />
                  </div>
                </div>
                {!isCollapsed && (
                  <div style={{ padding: '8px 16px 12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 2 }}>
                      {items.map((item, i) => {
                        const globalIdx = checklist.indexOf(item);
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
                            <button
                              onClick={() => toggleCheck(globalIdx)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  toggleCheck(globalIdx);
                                }
                              }}
                              aria-label={`Toggle ${item.item}`}
                              role="checkbox"
                              aria-checked={item.passed === true ? 'true' : item.passed === false ? 'false' : 'mixed'}
                              tabIndex={0}
                              style={{
                                width: 16, height: 16, borderRadius: 4, border: '1px solid',
                                flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: item.passed === true ? '#22c55e' : item.passed === false ? '#ef4444' : 'transparent',
                                borderColor: item.passed === true ? '#22c55e' : item.passed === false ? '#ef4444' : 'rgba(15, 23, 42, 0.15)',
                                color: item.passed !== null ? '#fff' : 'transparent',
                                fontSize: 9, fontWeight: 700,
                                transition: 'all 0.15s',
                              }}>
                              {item.passed === true ? '✓' : item.passed === false ? '✗' : ''}
                            </button>
                            <span style={{
                              fontSize: 10, flex: 1,
                              color: item.passed === true ? 'rgba(15, 23, 42, 0.4)' : item.passed === false ? 'rgba(239,68,68,0.6)' : 'rgba(15, 23, 42, 0.5)',
                              textDecoration: item.passed === false ? 'line-through' : 'none',
                            }}>{item.item}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(15, 23, 42, 0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Overall Notes</div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            style={{
              width: '100%', background: '#FFFFFF', border: '1px solid var(--border)',
              borderRadius: 10, padding: 12, color: '#0F172A', fontSize: 12, resize: 'vertical',
              fontFamily: 'inherit', outline: 'none',
            }}
            placeholder="Summarize overall condition, notable findings..."
          />
        </div>

        <button onClick={handleSubmit} style={{
          width: '100%', padding: '14px', borderRadius: 10,
          background: 'var(--gold)', color: '#000', border: 'none',
          fontSize: 13, fontWeight: 900, cursor: 'pointer',
          textTransform: 'uppercase', letterSpacing: '0.06em',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'opacity 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          <FileText size={16} /> Submit Inspection Report ({Math.round((passed / total) * 100)}%)
        </button>
        <div style={{ fontSize: 9, color: 'rgba(15, 23, 42, 0.25)', textAlign: 'center', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <Keyboard size={10} /> Tip: Press Ctrl+S to submit quickly
        </div>
      </div>
    </div>
  );
}
