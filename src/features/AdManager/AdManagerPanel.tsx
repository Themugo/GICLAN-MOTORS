import React, { useEffect, useState } from 'react';
import { X, Trash2, Plus, Eye, EyeOff, Loader2 } from 'lucide-react';
import { AdSlot, AdPlacement, AdSlotInput, AdStat, getAllAdSlots, getAdStats, createAdSlot, updateAdSlot, deleteAdSlot, AdApiError } from '../../services/adApi';

interface AdManagerPanelProps {
  onClose: () => void;
}

const PLACEMENT_LABELS: Record<AdPlacement, string> = {
  top_ticker: 'Top Scrolling Strip',
  left_rail: 'Left Floating Rail',
  right_rail: 'Right Floating Rail',
  mid_grid: 'Mid-Grid Card',
  sidebar: 'Filter Sidebar',
};

const EMPTY_DRAFT: AdSlotInput = {
  placement: 'top_ticker',
  title: '',
  tagline: '',
  priceTag: '',
  buttonText: '',
  buttonUrl: '',
  backgroundColor: '#1E3063',
  textColor: '#FFFFFF',
  opacity: 100,
  sortOrder: 0,
};

/**
 * Real, backend-connected Ad Manager - deliberately different from
 * HomePageAdminPanel (which is localStorage-only, presentation-only
 * page layout). Every real advertiser's ad needs to be visible to
 * every real visitor, so every action here (create/edit/color/hide/
 * remove) is a real call to the real backend, not local-only state -
 * confirmed end-to-end against a real database before this panel was
 * built (see the commit history for this feature). The admin writes
 * any text and picks any color for any advertiser here, entirely
 * through this UI - no code change is ever needed.
 */
export const AdManagerPanel: React.FC<AdManagerPanelProps> = ({ onClose }) => {
  const [slots, setSlots] = useState<AdSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [draft, setDraft] = useState<AdSlotInput>(EMPTY_DRAFT);
  const [creating, setCreating] = useState(false);
  const [stats, setStats] = useState<AdStat[]>([]);

  const loadSlots = () => {
    setLoading(true);
    setError(null);
    Promise.all([getAllAdSlots(), getAdStats()])
      .then(([nextSlots, nextStats]) => { setSlots(nextSlots); setStats(nextStats); })
      .catch((err) => setError(err instanceof AdApiError ? err.message : 'Could not load ads.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSlots(); }, []);

  const handleFieldChange = (id: string, field: keyof AdSlotInput | 'isVisible', value: string | number | boolean) => {
    setSlots((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSave = async (slot: AdSlot) => {
    setSavingId(slot.id);
    try {
      const updated = await updateAdSlot(slot.id, {
        placement: slot.placement,
        title: slot.title,
        tagline: slot.tagline,
        priceTag: slot.priceTag,
        buttonText: slot.buttonText,
        buttonUrl: slot.buttonUrl,
        backgroundColor: slot.backgroundColor,
        textColor: slot.textColor,
        opacity: slot.opacity,
        isVisible: slot.isVisible,
        sortOrder: slot.sortOrder,
      });
      setSlots((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    } catch (err) {
      setError(err instanceof AdApiError ? err.message : 'Could not save this ad.');
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleVisible = async (slot: AdSlot) => {
    setSavingId(slot.id);
    try {
      const updated = await updateAdSlot(slot.id, { isVisible: !slot.isVisible });
      setSlots((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    } catch (err) {
      setError(err instanceof AdApiError ? err.message : 'Could not update visibility.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (slot: AdSlot) => {
    if (!window.confirm(`Remove "${slot.title}" permanently? This cannot be undone.`)) return;
    setSavingId(slot.id);
    try {
      await deleteAdSlot(slot.id);
      setSlots((prev) => prev.filter((s) => s.id !== slot.id));
    } catch (err) {
      setError(err instanceof AdApiError ? err.message : 'Could not remove this ad.');
      setSavingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    setCreating(true);
    try {
      const created = await createAdSlot(draft);
      setSlots((prev) => [...prev, created]);
      setDraft(EMPTY_DRAFT);
      setShowAddForm(false);
    } catch (err) {
      setError(err instanceof AdApiError ? err.message : 'Could not create this ad.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#1E3063]">Ad Manager</h2>
            <p className="text-xs text-slate-500 mt-0.5">Control every ad slot on the page — toggle visibility, adjust transparency, edit the pitch, or remove a placement.</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold">
              {error}
            </div>
          )}

          {!loading && slots.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] uppercase tracking-wide text-slate-500">Impressions</div><div className="text-lg font-bold text-slate-800">{stats.reduce((n, a) => n + a.impressions, 0).toLocaleString()}</div></div>
              <div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] uppercase tracking-wide text-slate-500">Clicks</div><div className="text-lg font-bold text-slate-800">{stats.reduce((n, a) => n + a.clicks, 0).toLocaleString()}</div></div>
              <div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] uppercase tracking-wide text-slate-500">CTR</div><div className="text-lg font-bold text-slate-800">{(() => { const i=stats.reduce((n,a)=>n+a.impressions,0); const c=stats.reduce((n,a)=>n+a.clicks,0); return i ? `${((c/i)*100).toFixed(2)}%` : '0.00%'; })()}</div></div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ) : (
            <>
              {slots.map((slot) => (
                <div key={slot.id} className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <select
                      value={slot.placement}
                      onChange={(e) => handleFieldChange(slot.id, 'placement', e.target.value)}
                      className="text-xs font-bold text-[#1E3063] border border-slate-200 rounded-lg px-2 py-1"
                    >
                      {Object.entries(PLACEMENT_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleVisible(slot)}
                        disabled={savingId === slot.id}
                        className={`p-1.5 rounded-lg ${slot.isVisible ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-100'}`}
                        title={slot.isVisible ? 'Visible on page' : 'Hidden from page'}
                      >
                        {slot.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(slot)}
                        disabled={savingId === slot.id}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                        title="Remove Ad"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <input
                    value={slot.title}
                    onChange={(e) => handleFieldChange(slot.id, 'title', e.target.value)}
                    placeholder="Title"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold"
                  />
                  <input
                    value={slot.tagline || ''}
                    onChange={(e) => handleFieldChange(slot.id, 'tagline', e.target.value)}
                    placeholder="Tagline"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={slot.priceTag || ''}
                      onChange={(e) => handleFieldChange(slot.id, 'priceTag', e.target.value)}
                      placeholder="Price Tag (e.g. From Ksh 15,000/mo)"
                      className="border border-slate-200 rounded-lg px-3 py-2 text-xs"
                    />
                    <input
                      value={slot.buttonText || ''}
                      onChange={(e) => handleFieldChange(slot.id, 'buttonText', e.target.value)}
                      placeholder="Button Text"
                      className="border border-slate-200 rounded-lg px-3 py-2 text-xs"
                    />
                  </div>
                  <input
                    value={slot.buttonUrl || ''}
                    onChange={(e) => handleFieldChange(slot.id, 'buttonUrl', e.target.value)}
                    placeholder="Button Link (https://...)"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />

                  <div className="flex items-center gap-4 flex-wrap">
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      Background
                      <input
                        type="color"
                        value={slot.backgroundColor}
                        onChange={(e) => handleFieldChange(slot.id, 'backgroundColor', e.target.value)}
                        className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      Text
                      <input
                        type="color"
                        value={slot.textColor}
                        onChange={(e) => handleFieldChange(slot.id, 'textColor', e.target.value)}
                        className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-600 flex-1 min-w-[140px]">
                      Transparency
                      <input
                        type="range"
                        min={10}
                        max={100}
                        value={slot.opacity}
                        onChange={(e) => handleFieldChange(slot.id, 'opacity', Number(e.target.value))}
                        className="flex-1"
                      />
                      <span className="w-8 text-right">{slot.opacity}%</span>
                    </label>
                  </div>

                  {/* Live preview, using this slot's own real colors */}
                  <div
                    className="rounded-lg px-3 py-2 text-xs font-semibold"
                    style={{ backgroundColor: slot.backgroundColor, color: slot.textColor, opacity: slot.opacity / 100 }}
                  >
                    {slot.title || 'Preview'}{slot.tagline ? ` — ${slot.tagline}` : ''}
                  </div>

                  <button
                    onClick={() => handleSave(slot)}
                    disabled={savingId === slot.id}
                    className="bg-[#1E3063] hover:bg-[#17244B] text-white text-xs font-bold rounded-lg px-4 py-2 disabled:opacity-50"
                  >
                    {savingId === slot.id ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              ))}

              {showAddForm ? (
                <form onSubmit={handleCreate} className="border-2 border-dashed border-[#C85A32]/40 rounded-xl p-4 space-y-3">
                  <select
                    value={draft.placement}
                    onChange={(e) => setDraft((d) => ({ ...d, placement: e.target.value as AdPlacement }))}
                    className="text-xs font-bold text-[#1E3063] border border-slate-200 rounded-lg px-2 py-1"
                  >
                    {Object.entries(PLACEMENT_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                  <input
                    value={draft.title}
                    onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                    placeholder="Title"
                    required
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    value={draft.tagline}
                    onChange={(e) => setDraft((d) => ({ ...d, tagline: e.target.value }))}
                    placeholder="Tagline"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                  <div className="flex gap-2">
                    <button type="submit" disabled={creating} className="bg-[#C85A32] hover:bg-[#B34E29] text-white text-xs font-bold rounded-lg px-4 py-2 disabled:opacity-50">
                      {creating ? 'Creating…' : 'Create Ad'}
                    </button>
                    <button type="button" onClick={() => setShowAddForm(false)} className="text-xs font-semibold text-slate-500 px-4 py-2">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full border-2 border-dashed border-slate-200 hover:border-[#C85A32] rounded-xl py-3 text-xs font-bold text-slate-500 hover:text-[#C85A32] flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add New Ad
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdManagerPanel;
