import { useRef, useState, useEffect } from 'react';
import { Search, X, Clock } from 'lucide-react';
import { useRecentSearches } from '../../../hooks/useRecentSearches';
import { autocompleteSearch } from '../../../services/searchApi';

const MAX_RECENT = 8;

const DEFAULT_BRANDS = [
  'BMW', 'Mercedes', 'Toyota', 'Nissan', 'Subaru',
  'Audi', 'Lexus', 'Range Rover', 'Volkswagen', 'Mazda',
];

interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  suggestions?: string[];
  placeholder?: string;
  autoFocus?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function SearchBar({
  value = '',
  onChange,
  onSubmit,
  suggestions = DEFAULT_BRANDS,
  placeholder = 'Search by make, model, or keyword…',
  autoFocus = false,
  size = 'md',
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [remoteSuggestions, setRemoteSuggestions] = useState<string[]>([]);
  const { recentSearches, addRecentSearch, clearRecentSearches } = useRecentSearches();

  useEffect(() => {
    if (autoFocus && inputRef.current) inputRef.current.focus();
  }, [autoFocus]);

  useEffect(() => {
    let cancelled = false;
    const query = value.trim();
    if (query.length < 2) { setRemoteSuggestions([]); return undefined; }
    const timer = window.setTimeout(async () => {
      try {
        const results = await autocompleteSearch(query);
        if (!cancelled) setRemoteSuggestions(results.map(item => item.text));
      } catch {
        if (!cancelled) setRemoteSuggestions([]);
      }
    }, 180);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [value]);

  const matched = value
    ? (remoteSuggestions.length ? remoteSuggestions : suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase())))
    : suggestions;
  const showSuggestions = focused && matched.length > 0 && matched[0] !== value;
  const showRecent = focused && !value && recentSearches.length > 0;

  const handleSelect = (query) => {
    onChange?.(query);
    onSubmit?.(query);
    addRecentSearch(query);
    inputRef.current?.blur();
  };

  const clearRecent = (e) => {
    e.stopPropagation();
    void clearRecentSearches();
  };

  const padY = size === 'sm' ? 9 : size === 'lg' ? 15 : 12;
  const iconSize = size === 'sm' ? 15 : size === 'lg' ? 19 : 17;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 16 : 14;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          background: focused ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.02)',
          border: `1px solid ${focused ? 'var(--gold)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 10,
          boxShadow: focused ? '0 0 0 3px rgba(37, 99, 235,0.10)' : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        <Search
          size={iconSize}
          style={{
            color: focused || value ? 'var(--gold)' : 'rgba(255,255,255,0.4)',
            marginLeft: 12,
            flexShrink: 0,
            transition: 'color 0.2s',
          }}
        />
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={e => onChange?.(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              if (value.trim()) {
                onSubmit?.(value);
                addRecentSearch(value);
                          }
              inputRef.current?.blur();
            }
          }}
          placeholder={placeholder}
          aria-label="Search cars"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#fff',
            fontSize,
            fontWeight: 500,
            padding: `${padY}px 12px`,
            fontFamily: 'var(--font-body)',
            minWidth: 0,
          }}
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange?.(''); inputRef.current?.focus(); }}
            aria-label="Clear search"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              borderRadius: '50%',
              width: 22, height: 22,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.6)',
              marginRight: 8,
              flexShrink: 0,
            }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {(showSuggestions || showRecent) && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0, right: 0,
            background: '#0c0c0c',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            overflow: 'hidden',
            zIndex: 50,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            maxHeight: 320, overflowY: 'auto',
          }}
        >
          {showRecent && (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 14px 4px',
              }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Recent Searches
                </span>
                <button onClick={clearRecent} style={{
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)',
                  fontSize: 9, cursor: 'pointer', padding: 0,
                }}>
                  Clear
                </button>
              </div>
              {recentSearches.slice(0, MAX_RECENT).map(q => (
                <button
                  key={q}
                  type="button"
                  onMouseDown={() => handleSelect(q)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '9px 14px',
                    background: 'transparent', border: 'none',
                    color: 'rgba(255,255,255,0.75)',
                    fontSize: 12.5, fontFamily: 'var(--font-body)',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <Clock size={12} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                  <span>{q}</span>
                </button>
              ))}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '4px 14px' }} />
            </>
          )}

          {showSuggestions && matched.slice(0, 8).map(brand => (
            <button
              key={brand}
              type="button"
              onMouseDown={() => handleSelect(brand)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '9px 14px',
                background: 'transparent', border: 'none',
                color: 'rgba(255,255,255,0.85)',
                fontSize: 12.5, fontFamily: 'var(--font-body)',
                cursor: 'pointer', textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Search size={12} style={{ color: 'var(--gold)', flexShrink: 0 }} />
              <span>{brand}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
