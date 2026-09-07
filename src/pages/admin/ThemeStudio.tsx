import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDesignTheme } from '../../theme/DesignThemeProvider';
import {
  DEFAULT_THEME,
  FONT_OPTIONS,
  type ThemeConfig,
  type ThemeColors,
  type ThemeFonts,
  type ThemeSizes,
  type ThemeLayouts,
  type ThemeTimeRule,
} from '../../theme/themeTypes';
import {
  Palette,
  Type,
  Maximize2,
  Layout,
  Clock,
  Save,
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

type Tab = 'colors' | 'fonts' | 'sizes' | 'layouts' | 'time';

const TABS: { id: Tab; label: string; icon: typeof Palette }[] = [
  { id: 'colors', label: 'Colors', icon: Palette },
  { id: 'fonts', label: 'Fonts', icon: Type },
  { id: 'sizes', label: 'Sizes', icon: Maximize2 },
  { id: 'layouts', label: 'Layouts', icon: Layout },
  { id: 'time', label: 'Time', icon: Clock },
];

const PRIMARY_COLOR_FIELDS: { key: keyof ThemeColors; label: string }[] = [
  { key: 'pageBg', label: 'Page Background' },
  { key: 'bodyText', label: 'Body Text' },
  { key: 'headingText', label: 'Heading Text' },
  { key: 'buttonBg', label: 'Button Background' },
  { key: 'buttonText', label: 'Button Text' },
];

const THEME_COLOR_FIELDS: { key: keyof ThemeColors; label: string }[] = [
  { key: 'navbarBg', label: 'Navbar Background' },
  { key: 'navbarText', label: 'Navbar Text' },
  { key: 'navbarAccent', label: 'Navbar Accent' },
  { key: 'heroBg', label: 'Hero Background' },
  { key: 'heroText', label: 'Hero Text' },
  { key: 'heroAccent', label: 'Hero Accent' },
  { key: 'footerBg', label: 'Footer Background' },
  { key: 'footerText', label: 'Footer Text' },
  { key: 'footerAccent', label: 'Footer Accent' },
  { key: 'cardBg', label: 'Card Background' },
  { key: 'cardBorder', label: 'Card Border' },
  { key: 'cardHeading', label: 'Card Heading' },
  { key: 'cardBody', label: 'Card Body' },
  { key: 'cardAccent', label: 'Card Accent' },
  { key: 'dashboardBg', label: 'Dashboard Background' },
  { key: 'dashboardCardBg', label: 'Dashboard Card Background' },
  { key: 'dashboardHeading', label: 'Dashboard Heading' },
  { key: 'dashboardAccent', label: 'Dashboard Accent' },
];

const TIME_COLOR_FIELDS: { key: keyof ThemeColors; label: string }[] = [
  { key: 'pageBg', label: 'Page Background' },
  { key: 'bodyText', label: 'Body Text' },
  { key: 'headingText', label: 'Heading Text' },
  { key: 'navbarBg', label: 'Navbar Background' },
  { key: 'heroBg', label: 'Hero Background' },
];

const NAVBAR_LAYOUTS: { value: string; label: string }[] = [
  { value: 'split', label: 'Split' },
  { value: 'centered', label: 'Centered' },
  { value: 'compact', label: 'Compact' },
];

const HERO_LAYOUTS: { value: string; label: string }[] = [
  { value: 'centered', label: 'Centered' },
  { value: 'split', label: 'Split' },
  { value: 'minimal', label: 'Minimal' },
];

const FOOTER_LAYOUTS: { value: string; label: string }[] = [
  { value: 'four-col', label: 'Four Column' },
  { value: 'three-col', label: 'Three Column' },
  { value: 'two-col', label: 'Two Column' },
  { value: 'centered', label: 'Centered' },
];

const CARD_LAYOUTS: { value: string; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'compact', label: 'Compact' },
  { value: 'magazine', label: 'Magazine' },
];

const DASHBOARD_LAYOUTS: { value: string; label: string }[] = [
  { value: 'grid', label: 'Grid' },
  { value: 'list', label: 'List' },
  { value: 'sidebar', label: 'Sidebar' },
];

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0 w-10 h-10 rounded-lg overflow-hidden border-2 border-[var(--border)]">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
        />
        <div className="w-full h-full" style={{ background: value }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold mb-1 truncate" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-2 py-1 rounded-md border text-xs font-mono"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            height: 32,
          }}
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

function LayoutSelector({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <label
        className="block text-xs font-semibold mb-2 uppercase tracking-wider"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={value === opt.value ? 'pill-active' : 'pill-inactive'}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (val: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </label>
        <span
          className="text-xs font-mono font-bold px-2 py-0.5 rounded-md"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        >
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, var(--brand) 0%, var(--brand) ${((value - min) / (max - min)) * 100}%, var(--bg-secondary) ${((value - min) / (max - min)) * 100}%, var(--bg-secondary) 100%)`,
        }}
      />
      <div className="flex justify-between text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

export default function ThemeStudio() {
  const navigate = useNavigate();
  const { theme, saveTheme, resetTheme } = useDesignTheme();

  const [activeTab, setActiveTab] = useState<Tab>('colors');
  const [draft, setDraft] = useState<ThemeConfig>({ ...theme });
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setDraft({ ...theme });
  }, [theme]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const updateColor = useCallback((key: keyof ThemeColors, value: string) => {
    setDraft((prev) => ({ ...prev, colors: { ...prev.colors, [key]: value } }));
  }, []);

  const updateTimeColor = useCallback(
    (phase: 'dayColors' | 'nightColors', key: keyof ThemeColors, value: string) => {
      setDraft((prev) => ({
        ...prev,
        time: {
          ...prev.time,
          [phase]: { ...prev.time[phase], [key]: value },
        },
      }));
    },
    [],
  );

  const updateFont = useCallback((key: keyof ThemeFonts, value: string) => {
    setDraft((prev) => ({ ...prev, fonts: { ...prev.fonts, [key]: value } }));
  }, []);

  const updateSize = useCallback((key: keyof ThemeSizes, value: number) => {
    setDraft((prev) => ({ ...prev, sizes: { ...prev.sizes, [key]: value } }));
  }, []);

  const updateLayout = useCallback((key: keyof ThemeLayouts, value: string) => {
    setDraft((prev) => ({ ...prev, layouts: { ...prev.layouts, [key]: value } }));
  }, []);

  const updateTime = useCallback((key: keyof ThemeTimeRule, value: unknown) => {
    setDraft((prev) => ({ ...prev, time: { ...prev.time, [key]: value } }));
  }, []);

  const handleSave = async () => {
    try {
      await saveTheme(draft);
      setToast({ type: 'success', message: 'Theme saved successfully' });
    } catch {
      setToast({ type: 'error', message: 'Failed to save theme' });
    }
  };

  const handleReset = () => {
    resetTheme();
    setDraft({ ...DEFAULT_THEME });
    setToast({ type: 'success', message: 'Theme reset to defaults' });
  };

  const currentHour = new Date().getHours();
  const isDay =
    currentHour >= draft.time.dayStartHour && currentHour < draft.time.nightStartHour;

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="section-label">Admin Studio</div>
            <h1 className="section-heading text-2xl md:text-3xl mt-1">Theme Studio</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Customize every aspect of the KAYAD design system
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="btn-outline-dark text-sm"
          >
            Back
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 ${activeTab === tab.id ? 'pill-active' : 'pill-inactive'}`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div
          className="rounded-2xl p-6 md:p-8"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {/* COLORS TAB */}
          {activeTab === 'colors' && (
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="section-label mb-4">Primary Colors</div>
                <div className="space-y-4">
                  {PRIMARY_COLOR_FIELDS.map((f) => (
                    <ColorField
                      key={f.key}
                      label={f.label}
                      value={draft.colors[f.key]}
                      onChange={(v) => updateColor(f.key, v)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <div className="section-label mb-4">Theme Colors</div>
                <div className="space-y-4">
                  {THEME_COLOR_FIELDS.map((f) => (
                    <ColorField
                      key={f.key}
                      label={f.label}
                      value={draft.colors[f.key]}
                      onChange={(v) => updateColor(f.key, v)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* FONTS TAB */}
          {activeTab === 'fonts' && (
            <div className="space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Heading Font
                  </label>
                  <select
                    value={draft.fonts.heading}
                    onChange={(e) => updateFont('heading', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border text-sm font-semibold"
                    style={{
                      borderColor: 'var(--border)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Body Font
                  </label>
                  <select
                    value={draft.fonts.body}
                    onChange={(e) => updateFont('body', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border text-sm font-semibold"
                    style={{
                      borderColor: 'var(--border)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Font Preview */}
              <div
                className="rounded-xl p-6"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-soft)',
                }}
              >
                <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
                  Preview
                </div>
                <h2
                  className="text-3xl font-bold mb-3"
                  style={{ fontFamily: draft.fonts.heading, color: 'var(--text-primary)' }}
                >
                  The quick brown fox jumps over the lazy dog
                </h2>
                <p
                  className="text-base leading-relaxed"
                  style={{ fontFamily: draft.fonts.body, color: 'var(--text-secondary)' }}
                >
                  KAYAD is Kenya's premier automotive marketplace — offering verified dealers,
                  live auctions, M-Pesa escrow protection, and 150-point pre-inspections to keep
                  every transaction safe and transparent.
                </p>
                <div className="flex gap-4 mt-4">
                  <span
                    className="text-xs px-3 py-1 rounded-full font-semibold"
                    style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}
                  >
                    Heading: {draft.fonts.heading}
                  </span>
                  <span
                    className="text-xs px-3 py-1 rounded-full font-semibold"
                    style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}
                  >
                    Body: {draft.fonts.body}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SIZES TAB */}
          {activeTab === 'sizes' && (
            <div className="space-y-8 max-w-xl">
              <RangeField
                label="Heading Scale"
                value={draft.sizes.headingScale}
                min={0.75}
                max={1.5}
                step={0.05}
                unit="x"
                onChange={(v) => updateSize('headingScale', v)}
              />
              <RangeField
                label="Body Scale"
                value={draft.sizes.bodyScale}
                min={0.85}
                max={1.2}
                step={0.05}
                unit="x"
                onChange={(v) => updateSize('bodyScale', v)}
              />
              <RangeField
                label="Section Padding"
                value={draft.sizes.sectionPadding}
                min={40}
                max={160}
                step={10}
                unit="px"
                onChange={(v) => updateSize('sectionPadding', v)}
              />
              <RangeField
                label="Card Padding"
                value={draft.sizes.cardPadding}
                min={8}
                max={32}
                step={2}
                unit="px"
                onChange={(v) => updateSize('cardPadding', v)}
              />
              <RangeField
                label="Border Radius"
                value={draft.sizes.radius}
                min={0}
                max={32}
                step={2}
                unit="px"
                onChange={(v) => updateSize('radius', v)}
              />

              {/* Live Preview */}
              <div
                className="rounded-xl p-6"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-soft)' }}
              >
                <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
                  Live Preview
                </div>
                <div
                  style={{ padding: draft.sizes.sectionPadding / 2 }}
                  className="rounded-xl"
                >
                  <h3
                    className="font-bold mb-3"
                    style={{
                      fontFamily: draft.fonts.heading,
                      color: 'var(--text-primary)',
                      fontSize: `${1.5 * draft.sizes.headingScale}rem`,
                    }}
                  >
                    Section Heading
                  </h3>
                  <div
                    className="rounded-xl"
                    style={{
                      padding: draft.sizes.cardPadding,
                      border: '1px solid var(--border)',
                      background: 'var(--bg-card)',
                      borderRadius: draft.sizes.radius,
                    }}
                  >
                    <p
                      style={{
                        fontFamily: draft.fonts.body,
                        color: 'var(--text-secondary)',
                        fontSize: `${1 * draft.sizes.bodyScale}rem`,
                      }}
                    >
                      This card demonstrates your current size settings. Adjust the sliders above
                      to see real-time changes to spacing, scale, and border radius.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LAYOUTS TAB */}
          {activeTab === 'layouts' && (
            <div className="space-y-8 max-w-xl">
              <LayoutSelector
                label="Navbar Layout"
                options={NAVBAR_LAYOUTS}
                value={draft.layouts.navbar}
                onChange={(v) => updateLayout('navbar', v)}
              />
              <LayoutSelector
                label="Hero Layout"
                options={HERO_LAYOUTS}
                value={draft.layouts.hero}
                onChange={(v) => updateLayout('hero', v)}
              />
              <LayoutSelector
                label="Footer Layout"
                options={FOOTER_LAYOUTS}
                value={draft.layouts.footer}
                onChange={(v) => updateLayout('footer', v)}
              />
              <LayoutSelector
                label="Card Layout"
                options={CARD_LAYOUTS}
                value={draft.layouts.card}
                onChange={(v) => updateLayout('card', v)}
              />
              <LayoutSelector
                label="Dashboard Layout"
                options={DASHBOARD_LAYOUTS}
                value={draft.layouts.dashboard}
                onChange={(v) => updateLayout('dashboard', v)}
              />

              {/* Layout Preview */}
              <div
                className="rounded-xl p-6"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-soft)' }}
              >
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                  Current Selections
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['navbar', 'hero', 'footer', 'card', 'dashboard'] as const).map((k) => (
                    <span
                      key={k}
                      className="text-xs px-3 py-1 rounded-full font-semibold"
                      style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}
                    >
                      {k}: {draft.layouts[k]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TIME TAB */}
          {activeTab === 'time' && (
            <div className="space-y-8">
              {/* Enable toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Time-Based Theme Switching
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Automatically switch between day and night colors
                  </div>
                </div>
                <button
                  onClick={() => updateTime('enabled', !draft.time.enabled)}
                  className="relative w-14 h-7 rounded-full transition-colors duration-200"
                  style={{
                    background: draft.time.enabled ? 'var(--brand)' : 'var(--bg-secondary)',
                    border: `2px solid ${draft.time.enabled ? 'var(--brand)' : 'var(--border)'}`,
                  }}
                >
                  <div
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                    style={{
                      transform: `translateX(${draft.time.enabled ? '24px' : '2px'})`,
                    }}
                  />
                </button>
              </div>

              {/* Current Status */}
              <div
                className="flex items-center gap-3 rounded-xl p-4"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-soft)' }}
              >
                {isDay ? (
                  <CheckCircle size={18} style={{ color: 'var(--brand)' }} />
                ) : (
                  <AlertCircle size={18} style={{ color: 'var(--purple-500)' }} />
                )}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Current Time
                  </div>
                  <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    {String(currentHour).padStart(2, '0')}:
                    {String(new Date().getMinutes()).padStart(2, '0')} —{' '}
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{
                        background: isDay ? 'rgba(251, 191, 36, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                        color: isDay ? '#d97706' : '#6366f1',
                      }}
                    >
                      {isDay ? 'Day Mode' : 'Night Mode'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Hour inputs */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Day Start Hour
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={draft.time.dayStartHour}
                    onChange={(e) => updateTime('dayStartHour', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 rounded-xl border text-sm font-bold"
                    style={{
                      borderColor: 'var(--border)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Night Start Hour
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={draft.time.nightStartHour}
                    onChange={(e) => updateTime('nightStartHour', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 rounded-xl border text-sm font-bold"
                    style={{
                      borderColor: 'var(--border)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </div>

              {/* Day / Night color overrides */}
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <div className="section-label mb-4">Day Colors</div>
                  <div className="space-y-4">
                    {TIME_COLOR_FIELDS.map((f) => (
                      <ColorField
                        key={f.key}
                        label={f.label}
                        value={(draft.time.dayColors[f.key] as string) || DEFAULT_THEME.colors[f.key]}
                        onChange={(v) => updateTimeColor('dayColors', f.key, v)}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="section-label mb-4">Night Colors</div>
                  <div className="space-y-4">
                    {TIME_COLOR_FIELDS.map((f) => (
                      <ColorField
                        key={f.key}
                        label={f.label}
                        value={(draft.time.nightColors[f.key] as string) || DEFAULT_THEME.colors[f.key]}
                        onChange={(v) => updateTimeColor('nightColors', f.key, v)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mt-8">
          <button onClick={handleSave} className="btn-gold flex items-center gap-2">
            <Save size={16} />
            Save Theme
          </button>
          <button onClick={handleReset} className="btn-outline-dark flex items-center gap-2">
            <RotateCcw size={16} />
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold transition-all duration-300"
          style={{
            background: toast.type === 'success' ? 'var(--brand)' : 'var(--red-500)',
            color: '#fff',
          }}
        >
          {toast.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
