import { Link } from 'react-router-dom';

// ============================================================
// KAYAD UNIFIED DESIGN SYSTEM
// Premium Light Theme for Enterprise Dashboards
// ============================================================

// Design Tokens - Unified across all enterprise components
export const EnterpriseTokens = {
  // Brand Colors (KAYAD Design System)
  navy: '#17244B',
  navyLight: '#1e3054',
  navyDark: '#0f1833',
  beige: '#F6F1E8',
  beigeLight: '#FAF7F2',
  white: '#FFFFFF',

  // Semantic Colors
  emerald: '#10B981',
  emeraldLight: '#D1FAE5',
  terracotta: '#C77B58',
  terracottaLight: '#FDE8E0',
  softBlue: '#60A5FA',
  softBlueLight: '#DBEAFE',
  mutedOrange: '#FB923C',
  mutedOrangeLight: '#FED7AA',
  mutedCrimson: '#EF4444',
  mutedCrimsonLight: '#FEE2E2',
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',

  // Neutrals
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },

  // Semantic Aliases
  success: '#10B981',
  successBg: '#D1FAE5',
  successBorder: '#A7F3D0',
  warning: '#F59E0B',
  warningBg: '#FEF3C7',
  warningBorder: '#FDE68A',
  danger: '#EF4444',
  dangerBg: '#FEE2E2',
  dangerBorder: '#FECACA',
  info: '#3B82F6',
  infoBg: '#DBEAFE',
  infoBorder: '#BFDBFE',

  // Text Colors
  textPrimary: '#1E293B',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textDisabled: '#94A3B8',

  // Backgrounds
  bg: '#F6F1E8',
  bgLight: '#FAF7F2',
  card: '#FFFFFF',
  surface: '#F8FAFC',
  surfaceHover: '#F1F5F9',

  // Borders
  border: 'rgba(15, 23, 42, 0.08)',
  borderLight: 'rgba(15, 23, 42, 0.05)',
  borderMedium: 'rgba(15, 23, 42, 0.12)',
  borderFocus: '#17244B',

  // Shadows
  shadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
  shadowSm: '0 1px 2px rgba(0, 0, 0, 0.04)',
  shadowMd: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
  shadowLg: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
  shadowCard: '0 2px 8px -1px rgba(30, 48, 99, 0.06), 0 1px 4px -1px rgba(30, 48, 99, 0.04)',
  shadowCardHover: '0 12px 24px -4px rgba(30, 48, 99, 0.12), 0 4px 8px -2px rgba(30, 48, 99, 0.06)',
};

// Common Styles
const S = {
  // Card styles
  card: {
    background: EnterpriseTokens.card,
    border: `1px solid ${EnterpriseTokens.border}`,
    borderRadius: 16,
    overflow: 'hidden',
    transition: 'all 0.2s ease',
  },
  cardHover: {
    boxShadow: EnterpriseTokens.shadowCardHover,
    borderColor: EnterpriseTokens.borderMedium,
  },
  header: {
    padding: '16px 20px',
    borderBottom: `1px solid ${EnterpriseTokens.border}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  body: {
    padding: '20px',
  },

  // KPI Card styles
  kpi: {
    background: EnterpriseTokens.card,
    border: `1px solid ${EnterpriseTokens.border}`,
    borderRadius: 14,
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
  },
  kpiBg: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 80,
    height: 80,
    borderRadius: '50%',
    opacity: 0.06,
  },
  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    marginBottom: 12,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: EnterpriseTokens.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: '1.75rem',
    fontFamily: 'Outfit, sans-serif',
    fontWeight: 700,
    color: EnterpriseTokens.textPrimary,
    lineHeight: 1.1,
    marginBottom: 4,
  },
  kpiSub: {
    fontSize: 12,
    color: EnterpriseTokens.textMuted,
    marginTop: 2,
  },

  // Badge styles
  badge: (color, bgColor) => ({
    padding: '4px 10px',
    borderRadius: 9999,
    fontSize: 11,
    fontWeight: 600,
    background: bgColor || `${color}15`,
    color: color,
    display: 'inline-flex',
    alignItems: 'center',
  }),

  // Grid layouts
  grid2: { display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 24 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 },

  // Quick action styles
  actionLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    borderRadius: 12,
    background: EnterpriseTokens.surface,
    border: `1px solid ${EnterpriseTokens.border}`,
    textDecoration: 'none',
    color: 'inherit',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },

  // Activity item styles
  activityItem: {
    display: 'flex',
    gap: 12,
    padding: '12px 0',
    borderBottom: `1px solid ${EnterpriseTokens.borderLight}`,
  },
  timelineDot: (color) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: color,
    flexShrink: 0,
    marginTop: 6,
  }),

  // Notification styles
  notification: {
    display: 'flex',
    gap: 12,
    padding: '12px 0',
    borderBottom: `1px solid ${EnterpriseTokens.borderLight}`,
    cursor: 'pointer',
  },

  // Table styles
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 600,
    color: EnterpriseTokens.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '12px 16px',
    borderBottom: `1px solid ${EnterpriseTokens.border}`,
    background: EnterpriseTokens.surface,
  },
  td: {
    padding: '14px 16px',
    fontSize: 13,
    color: EnterpriseTokens.textSecondary,
    borderBottom: `1px solid ${EnterpriseTokens.borderLight}`,
  },

  // Empty state
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: EnterpriseTokens.textMuted,
  },

  // Skeleton loading
  skeleton: {
    background: `linear-gradient(90deg, ${EnterpriseTokens.surface} 25%, ${EnterpriseTokens.surfaceHover} 50%, ${EnterpriseTokens.surface} 75%)`,
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: 8,
  },
};

// ============================================================
// ENTERPRISE COMPONENTS
// ============================================================

export function EnterpriseCard({
  children,
  header,
  action,
  className,
  onMouseEnter,
  onMouseLeave,
  style,
  noPadding = false
}) {
  return (
    <div
      style={{ ...S.card, ...style }}
      className={className}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {header && (
        <div style={S.header}>
          <span style={{ fontSize: 14, fontWeight: 700, color: EnterpriseTokens.textPrimary }}>
            {header}
          </span>
          {action && (
            <span style={{ fontSize: 12, color: EnterpriseTokens.navy, fontWeight: 600, cursor: 'pointer' }}>
              {action}
            </span>
          )}
        </div>
      )}
      <div style={noPadding ? { padding: 0 } : header ? S.body : { padding: '20px' }}>
        {children}
      </div>
    </div>
  );
}

export function EnterpriseKPI({
  icon,
  label,
  value,
  sub,
  trend,
  accent = EnterpriseTokens.navy,
  className
}) {
  return (
    <div style={{ ...S.kpi, ...(className || {}) }}>
      <div style={{ ...S.kpiBg, background: accent }} />
      <div style={{ ...S.kpiIcon, background: `${accent}12`, color: accent }}>
        {icon}
      </div>
      <div style={S.kpiLabel}>{label}</div>
      <div style={S.kpiValue}>{value ?? '—'}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {trend !== undefined && (
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: trend >= 0 ? EnterpriseTokens.success : EnterpriseTokens.danger
          }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
        {sub && <span style={S.kpiSub}>{sub}</span>}
      </div>
    </div>
  );
}

export function EnterpriseTimeline({ items }) {
  if (!items || items.length === 0) {
    return (
      <div style={S.emptyState}>
        <p>No recent activity</p>
      </div>
    );
  }

  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ ...S.activityItem, borderBottom: i < items.length - 1 ? `1px solid ${EnterpriseTokens.borderLight}` : 'none' }}>
          <div style={S.timelineDot(item.color || EnterpriseTokens.navy)} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: EnterpriseTokens.textPrimary, marginBottom: 2 }}>
              {item.title}
            </p>
            <p style={{ fontSize: 12, color: EnterpriseTokens.textMuted }}>
              {item.description}
            </p>
          </div>
          {item.time && (
            <span style={{ fontSize: 11, color: EnterpriseTokens.textDisabled, whiteSpace: 'nowrap' }}>
              {item.time}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function EnterpriseNotifications({ items }) {
  if (!items || items.length === 0) {
    return (
      <div style={S.emptyState}>
        <p>No notifications</p>
      </div>
    );
  }

  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ ...S.notification, borderBottom: i < items.length - 1 ? `1px solid ${EnterpriseTokens.borderLight}` : 'none' }}>
          <div style={{ fontSize: 20 }}>{item.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: EnterpriseTokens.textPrimary }}>
                {item.title}
              </p>
              {item.unread && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: EnterpriseTokens.info }} />
              )}
            </div>
            <p style={{ fontSize: 12, color: EnterpriseTokens.textMuted, marginTop: 2 }}>
              {item.description}
            </p>
          </div>
          {item.time && (
            <span style={{ fontSize: 11, color: EnterpriseTokens.textDisabled, whiteSpace: 'nowrap' }}>
              {item.time}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function EnterpriseRevenue({ data, height = 200 }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ ...S.emptyState, height }}>
        <p>No revenue data</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height }}>
      {data.map((item, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: '100%',
              background: `linear-gradient(180deg, ${EnterpriseTokens.navy} 0%, ${EnterpriseTokens.navyLight} 100%)`,
              borderRadius: '6px 6px 0 0',
              minHeight: 4,
              height: `${(item.value / maxValue) * (height - 40)}px`,
              transition: 'height 0.3s ease',
            }}
          />
          <span style={{ fontSize: 10, color: EnterpriseTokens.textMuted }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function EnterpriseChart({ data, type = 'line', height = 200 }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ ...S.emptyState, height }}>
        <p>No chart data</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));

  if (type === 'bar') {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height }}>
        {data.map((item, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div
              style={{
                width: '100%',
                background: EnterpriseTokens.surface,
                borderRadius: 4,
                minHeight: 2,
                height: `${(item.value / maxValue) * (height - 30)}px`,
              }}
            />
            <span style={{ fontSize: 10, color: EnterpriseTokens.textMuted }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // Default: line chart visualization
  return (
    <div style={{ position: 'relative', height }}>
      <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={EnterpriseTokens.navy} stopOpacity="0.2" />
            <stop offset="100%" stopColor={EnterpriseTokens.navy} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Area fill */}
        <path
          d={`
            M ${data.map((_, i) => `${(i / (data.length - 1)) * 100}%`).join(' L ')}
            L 100% 100%
            L 0 100%
            Z
          `}
          fill="url(#chartGradient)"
        />
        {/* Line */}
        <polyline
          points={data.map((item, i) => `${(i / (data.length - 1)) * 100}%,${100 - (item.value / maxValue) * 80}%`).join(' ')}
          fill="none"
          stroke={EnterpriseTokens.navy}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Dots */}
        {data.map((item, i) => (
          <circle
            key={i}
            cx={`${(i / (data.length - 1)) * 100}%`}
            cy={`${100 - (item.value / maxValue) * 80}%`}
            r="3"
            fill={EnterpriseTokens.white}
            stroke={EnterpriseTokens.navy}
            strokeWidth="2"
          />
        ))}
      </svg>
      {/* Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        {data.map((item, i) => (
          <span key={i} style={{ fontSize: 10, color: EnterpriseTokens.textMuted }}>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function EnterpriseDonut({ data, size = 120 }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ ...S.emptyState, width: size, height: size }}>
        <p>No data</p>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = -90;

  const paths = data.map((item, i) => {
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const start = polarToCartesian(size / 2, size / 2, size / 2 - 10, startAngle);
    const end = polarToCartesian(size / 2, size / 2, size / 2 - 10, endAngle);
    const largeArcFlag = angle > 180 ? 1 : 0;

    const d = [
      `M ${start.x} ${start.y}`,
      `A ${size / 2 - 10} ${size / 2 - 10} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    ].join(' ');

    return { ...item, d, color: item.color || Object.values(EnterpriseTokens)[i + 10] };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width={size} height={size}>
        {paths.map((item, i) => (
          <path
            key={i}
            d={item.d}
            fill="none"
            stroke={item.color}
            strokeWidth="20"
            strokeLinecap="round"
          />
        ))}
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 25} fill={EnterpriseTokens.card} />
        <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle" fill={EnterpriseTokens.textPrimary} fontSize={20} fontWeight="700">
          {total.toLocaleString()}
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color || Object.values(EnterpriseTokens)[i + 10] }} />
            <span style={{ fontSize: 12, color: EnterpriseTokens.textSecondary }}>
              {item.label}: {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function polarToCartesian(cx, cy, radius, angle) {
  const rad = (angle * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

export function EnterpriseTable({ columns, data, emptyMessage = 'No data available' }) {
  if (!data || data.length === 0) {
    return (
      <div style={S.emptyState}>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <table style={S.table}>
      <thead>
        <tr>
          {columns.map((col, i) => (
            <th key={i} style={{ ...S.th, textAlign: col.align || 'left' }}>
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            {columns.map((col, j) => (
              <td key={j} style={{ ...S.td, textAlign: col.align || 'left' }}>
                {col.render ? col.render(row[col.key], row) : row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function EnterpriseBadge({ children, variant = 'default', className }) {
  const variants = {
    default: { bg: EnterpriseTokens.surface, color: EnterpriseTokens.textSecondary },
    success: { bg: EnterpriseTokens.successBg, color: EnterpriseTokens.success },
    warning: { bg: EnterpriseTokens.warningBg, color: EnterpriseTokens.warning },
    danger: { bg: EnterpriseTokens.dangerBg, color: EnterpriseTokens.danger },
    info: { bg: EnterpriseTokens.infoBg, color: EnterpriseTokens.info },
  };

  const style = variants[variant] || variants.default;

  return (
    <span
      style={{
        ...S.badge(style.color, style.bg),
        ...(className || {})
      }}
    >
      {children}
    </span>
  );
}

export function EnterpriseMetricRow({ items }) {
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {items.map((item, i) => (
        <div key={i} style={{ flex: 1 }}>
          <p style={{ fontSize: 11, color: EnterpriseTokens.textMuted, marginBottom: 4 }}>{item.label}</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: EnterpriseTokens.textPrimary }}>
              {item.value}
            </span>
            {item.trend !== undefined && (
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: item.trend >= 0 ? EnterpriseTokens.success : EnterpriseTokens.danger
              }}>
                {item.trend >= 0 ? '↑' : '↓'} {Math.abs(item.trend)}%
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardHeader({ title, subtitle, actions }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: EnterpriseTokens.textPrimary, marginBottom: 4 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 14, color: EnterpriseTokens.textMuted }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', gap: 8 }}>
          {actions}
        </div>
      )}
    </div>
  );
}

export function EnterpriseTabs({ tabs, activeTab, onChange }) {
  return (
    <div style={{
      display: 'flex',
      gap: 4,
      padding: 4,
      background: EnterpriseTokens.surface,
      borderRadius: 10,
      border: `1px solid ${EnterpriseTokens.border}`,
    }}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          style={{
            flex: 1,
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === tab.value ? EnterpriseTokens.card : 'transparent',
            color: activeTab === tab.value ? EnterpriseTokens.textPrimary : EnterpriseTokens.textMuted,
            fontWeight: activeTab === tab.value ? 600 : 500,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: activeTab === tab.value ? EnterpriseTokens.shadowSm : 'none',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function EnterpriseProgress({ value, max = 100, color = EnterpriseTokens.navy, showLabel = true }) {
  const percentage = (value / max) * 100;

  return (
    <div>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: EnterpriseTokens.textMuted }}>
            {value} / {max}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: EnterpriseTokens.textSecondary }}>
            {percentage.toFixed(0)}%
          </span>
        </div>
      )}
      <div style={{
        width: '100%',
        height: 6,
        background: EnterpriseTokens.surface,
        borderRadius: 3,
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          background: color,
          borderRadius: 3,
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  );
}

export function EnterpriseQuickActions({ items }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
      {items.map((item, i) => (
        <Link key={i} to={item.to} style={S.actionLink}>
          <span style={{ fontSize: 20 }}>{item.icon}</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: EnterpriseTokens.textPrimary }}>
              {item.label}
            </p>
            {item.desc && (
              <p style={{ fontSize: 11, color: EnterpriseTokens.textMuted }}>
                {item.desc}
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

// Skeleton loader component
export function EnterpriseSkeleton({ width = '100%', height = 20, className }) {
  return (
    <div
      style={{
        ...S.skeleton,
        width,
        height,
        ...(className || {})
      }}
    />
  );
}

// Empty state component
export function EnterpriseEmpty({ icon, title, description, action }) {
  return (
    <div style={{ ...S.emptyState, padding: '48px 24px' }}>
      {icon && <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>}
      <h3 style={{ fontSize: 16, fontWeight: 600, color: EnterpriseTokens.textPrimary, marginBottom: 8 }}>
        {title || 'No data available'}
      </h3>
      {description && (
        <p style={{ fontSize: 14, color: EnterpriseTokens.textMuted, marginBottom: 16 }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
