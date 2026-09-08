import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Search, X, Mic, Clock, TrendingUp } from 'lucide-react';
import { useRecentSearches } from '../../hooks/useRecentSearches';

const BRAND_SUGGESTIONS = [
  { type: 'brand', value: 'Toyota', icon: '🚗' },
  { type: 'brand', value: 'Mercedes-Benz', icon: '🚗' },
  { type: 'brand', value: 'BMW', icon: '🚗' },
  { type: 'brand', value: 'Nissan', icon: '🚗' },
  { type: 'brand', value: 'Subaru', icon: '🚗' },
  { type: 'brand', value: 'Audi', icon: '🚗' },
  { type: 'brand', value: 'Lexus', icon: '🚗' },
  { type: 'brand', value: 'Volkswagen', icon: '🚗' },
];

const TRENDING_SEARCHES = [
  'Toyota Land Cruiser',
  'Mercedes G-Wagon',
  'Nissan Patrol',
  'Toyota Prado',
];

function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function addRecentSearch(query) {
  try {
    const existing = getRecentSearches().filter(s => s.toLowerCase() !== query.toLowerCase());
    existing.unshift(query);
    localStorage.setItem(RECENT_KEY, JSON.stringify(existing.slice(0, MAX_RECENT)));
  } catch {}
}

function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {}
}

function MobileSearchBar({
  value = '',
  onChange,
  onSubmit,
  onVoiceSearch,
  placeholder = 'Search cars, brands, or models...',
  autoFocus = false,
  showVoice = true,
  showSuggestions = true,
  className = '',
}) {
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const { recentSearches, addRecentSearch, clearRecentSearches } = useRecentSearches();
  const [suggestions, setSuggestions] = useState([]);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Filter suggestions based on input
  useEffect(() => {
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }

    const query = value.toLowerCase();
    const filtered = BRAND_SUGGESTIONS.filter(s =>
      s.value.toLowerCase().includes(query)
    );
    setSuggestions(filtered);
  }, [value]);

  const handleFocus = useCallback(() => {
    setFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    // Delay to allow click events on suggestions
    setTimeout(() => setFocused(false), 200);
  }, []);

  const handleChange = useCallback((e) => {
    onChange?.(e.target.value);
  }, [onChange]);

  const handleSubmit = useCallback((query = value) => {
    if (query.trim()) {
      onSubmit?.(query);
      addRecentSearch(query);
        inputRef.current?.blur();
    }
  }, [value, onSubmit]);

  const handleSelectSuggestion = useCallback((suggestion) => {
    onChange?.(suggestion.value);
    handleSubmit(suggestion.value);
  }, [onChange, handleSubmit]);

  const handleClear = useCallback(() => {
    onChange?.('');
    inputRef.current?.focus();
  }, [onChange]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
    if (e.key === 'Escape') {
      inputRef.current?.blur();
    }
  }, [handleSubmit]);

  const handleVoiceClick = useCallback(() => {
    if (onVoiceSearch) {
      setIsListening(true);
      onVoiceSearch({
        onResult: (transcript) => {
          onChange?.(transcript);
          handleSubmit(transcript);
          setIsListening(false);
        },
        onError: () => {
          setIsListening(false);
        },
      });
    }
  }, [onVoiceSearch, onChange, handleSubmit]);

  const handleClearRecent = useCallback((e) => {
    e.stopPropagation();
    void clearRecentSearches();
  }, []);

  const showDropdown = focused && showSuggestions;
  const showRecent = focused && !value && recentSearches.length > 0;
  const showTrending = focused && !value && recentSearches.length === 0;
  const showResults = focused && suggestions.length > 0;

  return (
    <div className={`mobile-search ${className}`} ref={containerRef}>
      <div className={`mobile-search__container ${focused ? 'mobile-search__container--focused' : ''}`}>
        <Search
          size={20}
          className="mobile-search__icon"
          aria-hidden="true"
        />

        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search vehicles"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          role="combobox"
          className="mobile-search__input"
        />

        {value && (
          <button
            type="button"
            className="mobile-search__clear"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}

        {showVoice && !value && (
          <button
            type="button"
            className={`mobile-search__voice ${isListening ? 'mobile-search__voice--listening' : ''}`}
            onClick={handleVoiceClick}
            aria-label="Voice search"
          >
            <Mic size={18} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          className="mobile-search__suggestions"
          role="listbox"
          aria-label="Search suggestions"
        >
          {showRecent && (
            <>
              <div className="mobile-search__recent">
                <span>Recent Searches</span>
                <button
                  className="mobile-search__recent-btn"
                  onClick={handleClearRecent}
                >
                  Clear all
                </button>
              </div>
              {recentSearches.slice(0, MAX_RECENT).map((query, index) => (
                <button
                  key={`recent-${index}`}
                  className="mobile-search__suggestion"
                  onMouseDown={() => {
                    onChange?.(query);
                    handleSubmit(query);
                  }}
                  role="option"
                >
                  <Clock size={16} className="mobile-search__suggestion-icon" />
                  <span className="mobile-search__suggestion-text">{query}</span>
                </button>
              ))}
            </>
          )}

          {showTrending && (
            <>
              <div className="mobile-search__recent">
                <span>Trending</span>
              </div>
              {TRENDING_SEARCHES.map((query, index) => (
                <button
                  key={`trending-${index}`}
                  className="mobile-search__suggestion"
                  onMouseDown={() => {
                    onChange?.(query);
                    handleSubmit(query);
                  }}
                  role="option"
                >
                  <TrendingUp size={16} className="mobile-search__suggestion-icon" />
                  <span className="mobile-search__suggestion-text">{query}</span>
                </button>
              ))}
            </>
          )}

          {showResults && suggestions.map((suggestion, index) => (
            <button
              key={`suggestion-${index}`}
              className="mobile-search__suggestion"
              onMouseDown={() => handleSelectSuggestion(suggestion)}
              role="option"
            >
              <span className="mobile-search__suggestion-icon" aria-hidden="true">
                {suggestion.icon}
              </span>
              <span className="mobile-search__suggestion-text">
                {highlightMatch(suggestion.value, value)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper to highlight matching text
function highlightMatch(text, query) {
  if (!query) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) return text;

  const before = text.slice(0, index);
  const match = text.slice(index, index + query.length);
  const after = text.slice(index + query.length);

  return (
    <>
      {before}
      <span className="mobile-search__suggestion-highlight">{match}</span>
      {after}
    </>
  );
}

export default memo(MobileSearchBar);
