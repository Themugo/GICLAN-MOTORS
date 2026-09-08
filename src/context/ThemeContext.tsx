import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { preferencesAPI } from '../api/api.exports';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  isDarkMode: boolean;
  setTheme: (theme: Theme) => Promise<void>;
  toggleDarkMode: () => Promise<void>;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('system');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // Determine if system prefers dark mode
  const prefersDark = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }, []);

  // Calculate actual dark mode state
  const calculateDarkMode = useCallback((currentTheme: Theme): boolean => {
    if (currentTheme === 'system') {
      return prefersDark();
    }
    return currentTheme === 'dark';
  }, [prefersDark]);

  // Apply theme to document
  const applyTheme = useCallback((darkMode: boolean) => {
    if (typeof document === 'undefined') return;

    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
    setIsDarkMode(darkMode);
  }, []);

  // Initialize theme from server/user preference
  useEffect(() => {
    const initTheme = async () => {
      try {
        const prefs = await preferencesAPI.get();
        if (prefs?.theme) {
          setThemeState(prefs.theme);
          applyTheme(calculateDarkMode(prefs.theme));
        }
      } catch {
        // Fallback to system preference
        applyTheme(calculateDarkMode('system'));
      } finally {
        setLoading(false);
      }
    };
    initTheme();
  }, [applyTheme, calculateDarkMode]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme(calculateDarkMode('system'));

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme, applyTheme, calculateDarkMode]);

  // Set theme (persists to server)
  const setTheme = useCallback(async (newTheme: Theme) => {
    try {
      await preferencesAPI.setTheme(newTheme);
      setThemeState(newTheme);
      applyTheme(calculateDarkMode(newTheme));
    } catch (error) {
      console.error('Failed to save theme preference:', error);
      // Still apply locally even if server fails
      setThemeState(newTheme);
      applyTheme(calculateDarkMode(newTheme));
    }
  }, [applyTheme, calculateDarkMode]);

  // Toggle dark mode
  const toggleDarkMode = useCallback(async () => {
    try {
      const result = await preferencesAPI.toggleDarkMode();
      setThemeState(result.theme);
      applyTheme(calculateDarkMode(result.theme));
    } catch (error) {
      console.error('Failed to toggle dark mode:', error);
      // Local fallback
      const newTheme = isDarkMode ? 'light' : 'dark';
      setThemeState(newTheme);
      applyTheme(calculateDarkMode(newTheme));
    }
  }, [isDarkMode, applyTheme, calculateDarkMode]);

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, setTheme, toggleDarkMode, loading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
