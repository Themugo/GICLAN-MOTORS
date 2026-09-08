import { memo, Children, isValidElement, cloneElement } from 'react';
import { ChevronLeft, Search, Bell, Settings, Filter, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Header action button
function HeaderButton({ icon, onClick, badge, ariaLabel }) {
  return (
    <button
      className="mobile-header-btn"
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        background: 'var(--surface)',
        border: 'none',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.15s ease',
      }}
    >
      {icon}
      {badge > 0 && (
        <span style={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 16,
          height: 16,
          borderRadius: 8,
          background: 'var(--red-500)',
          color: 'white',
          fontSize: 10,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}

// Search header variant
function MobileSearchHeader({
  value,
  onChange,
  onSubmit,
  onVoiceSearch,
  placeholder = 'Search vehicles...',
  className = '',
}) {
  const navigate = useNavigate();

  return (
    <div className={`mobile-search-header ${className}`} style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '0 16px',
    }}>
      <div style={{ flex: 1 }}>
        <MobileSearchInput
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder={placeholder}
        />
      </div>
      <HeaderButton
        icon={<Filter size={20} />}
        onClick={() => {}}
        ariaLabel="Open filters"
      />
    </div>
  );
}

// Simple search input (for header)
function MobileSearchInput({ value, onChange, onSubmit, placeholder }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      background: 'var(--surface)',
      border: '1.5px solid var(--border)',
      borderRadius: 12,
      padding: '10px 14px',
      gap: 10,
    }}>
      <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      <input
        type="search"
        value={value}
        onChange={onChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit?.();
        }}
        placeholder={placeholder}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--text-primary)',
          fontSize: 15,
          minWidth: 0,
        }}
      />
    </div>
  );
}

// Large hero header
function MobileHeroHeader({
  title,
  subtitle,
  backgroundGradient,
  children,
  className = '',
}) {
  return (
    <div className={className} style={{
      background: backgroundGradient || 'linear-gradient(135deg, var(--bg-deep) 0%, var(--bg-base) 100%)',
      padding: '20px 16px 24px',
    }}>
      {title && (
        <h1 style={{
          fontSize: 28,
          fontWeight: 800,
          color: 'var(--text-primary)',
          marginBottom: subtitle ? 8 : 0,
          letterSpacing: '-0.02em',
        }}>
          {title}
        </h1>
      )}
      {subtitle && (
        <p style={{
          fontSize: 15,
          color: 'var(--text-muted)',
          lineHeight: 1.5,
        }}>
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}

// Tab header with sticky tabs
function MobileTabHeader({
  title,
  tabs,
  activeTab,
  onTabChange,
  className = '',
}) {
  return (
    <div className={className} style={{
      background: 'var(--bg-base)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 'calc(var(--header-height) + var(--safe-area-top))',
      zIndex: 50,
    }}>
      {title && (
        <div style={{
          padding: '12px 16px 0',
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--text-primary)',
        }}>
          {title}
        </div>
      )}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '12px 16px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id || tab}
            onClick={() => onTabChange?.(tab.id || tab)}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              border: 'none',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: activeTab === (tab.id || tab) ? 'var(--gold-500)' : 'var(--surface)',
              color: activeTab === (tab.id || tab) ? '#000' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.icon && <span style={{ marginRight: 6 }}>{tab.icon}</span>}
            {typeof tab === 'string' ? tab : tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Export common header configurations
const PRESET_HEADERS = {
  browse: {
    title: 'Browse Cars',
    actions: [
      { icon: <Search size={20} />, onClick: () => {}, ariaLabel: 'Search' },
      { icon: <Bell size={20} />, badge: 3, onClick: () => {}, ariaLabel: 'Notifications' },
    ],
  },
  auctions: {
    title: 'Live Auctions',
    actions: [
      { icon: <Bell size={20} />, onClick: () => {}, ariaLabel: 'Notifications' },
    ],
  },
  profile: {
    title: 'Profile',
    actions: [
      { icon: <Settings size={20} />, onClick: () => {}, ariaLabel: 'Settings' },
    ],
  },
};

export {
  HeaderButton,
  MobileSearchHeader,
  MobileSearchInput,
  MobileHeroHeader,
  MobileTabHeader,
  PRESET_HEADERS,
};

export default {
  Button: HeaderButton,
  Search: MobileSearchHeader,
  Hero: MobileHeroHeader,
  Tab: MobileTabHeader,
  PRESETS: PRESET_HEADERS,
};
