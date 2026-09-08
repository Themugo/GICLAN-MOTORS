import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { adminAPI } from '../api/api';

// Enhanced branding interface with comprehensive color customization
interface Branding {
  // Logo settings
  logoType: 'icon' | 'text' | 'image';
  logoText: string;
  logoUrl: string;
  brandTagline: string;

  // Primary color palette (green/mint theme)
  primaryColor: string;      // Main brand color (green: #16C4A4)
  primaryLight: string;     // Lighter variant (#2DD9BE)
  primaryDark: string;      // Darker variant (#0C7B68)
  primaryGlow: string;       // Glow effect (rgba)

  // Accent colors
  accentColor: string;      // Secondary accent

  // Background colors
  backgroundColor: string;  // Main background
  surfaceColor: string;     // Cards/surfaces
  cardColor: string;        // Card backgrounds

  // Text colors
  textColor: string;        // Primary text
  textMutedColor: string;   // Muted text
  textDimColor: string;     // Dim text

  // UI colors
  borderColor: string;      // Borders
  successColor: string;     // Success state
  dangerColor: string;      // Danger state
  warningColor: string;     // Warning state
  infoColor: string;        // Info state
}

interface BrandingContextValue {
  branding: Branding;
  loading: boolean;
  hydrated: boolean;
  // Helper to get computed CSS variables
  getCSSVariables: () => Record<string, string>;
}

// Default green/mint color scheme - maintaining the existing KAYAD green theme
const DEFAULT_BRANDING: Branding = {
  logoType: 'icon',
  logoText: 'KAYAD',
  logoUrl: '',
  brandTagline: 'Premium Automotive Marketplace',

  // Primary green/mint palette
  primaryColor: '#16C4A4',      // Main brand green
  primaryLight: '#2DD9BE',      // Lighter mint
  primaryDark: '#0C7B68',       // Darker green
  primaryGlow: 'rgba(22, 196, 164, 0.25)',

  accentColor: '#3B82F6',       // Blue accent

  // Background colors (warm cream theme)
  backgroundColor: '#FDFAF5',   // Main background
  surfaceColor: '#F7F2E8',      // Surface color
  cardColor: '#FFFFFF',        // Card color

  // Text colors (warm gray-brown)
  textColor: '#2E2B28',         // Primary text
  textMutedColor: '#9A9088',    // Muted text
  textDimColor: '#C8BFB0',     // Dim text

  // Border and status colors
  borderColor: '#E0D8C8',
  successColor: '#10B981',
  dangerColor: '#EF4444',
  warningColor: '#F59E0B',
  infoColor: '#3B82F6',
};

const BrandingCtx = createContext<BrandingContextValue | null>(null);

interface BrandingProviderProps {
  children: ReactNode;
}

export function BrandingProvider({ children }: BrandingProviderProps) {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // Hydration guard - prevent flash on SSR/client mismatch
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Apply CSS variables to document root whenever branding changes
  useEffect(() => {
    if (!branding) return;

    const root = document.documentElement;
    const cssVars = getCSSVariables(branding);

    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [branding]);

  useEffect(() => {
    if (!hydrated) return;

    adminAPI.getPublicConfig()
      .then(cfg => {
        const configBranding = cfg.config?.branding || cfg.branding;
        setBranding({ ...DEFAULT_BRANDING, ...configBranding });
        setLoading(false);
      })
      .catch(() => {
        // Fallback to defaults on error
        setBranding(DEFAULT_BRANDING);
        setLoading(false);
      });
  }, [hydrated]);

  // Helper function to generate CSS variables from branding
  function getCSSVariables(brandingData: Branding): Record<string, string> {
    return {
      '--brand': brandingData.primaryColor,
      '--brand-light': brandingData.primaryLight,
      '--brand-dark': brandingData.primaryDark,
      '--brand-glow': brandingData.primaryGlow,
      '--accent': brandingData.accentColor,
      '--bg': brandingData.backgroundColor,
      '--surface': brandingData.surfaceColor,
      '--card': brandingData.cardColor,
      '--text': brandingData.textColor,
      '--text-muted': brandingData.textMutedColor,
      '--text-dim': brandingData.textDimColor,
      '--border': brandingData.borderColor,
      '--success': brandingData.successColor,
      '--danger': brandingData.dangerColor,
      '--warning': brandingData.warningColor,
      '--info': brandingData.infoColor,
      // Also set the gold aliases for legacy support (using brand colors)
      '--gold': brandingData.primaryColor,
      '--gold-light': brandingData.primaryLight,
      '--gold-dark': brandingData.primaryDark,
      '--gold-glow': brandingData.primaryGlow,
      '--gold-glow-strong': brandingData.primaryGlow.replace('0.25', '0.4'),
      '--gold-100': `${brandingData.primaryColor}1F`,
      '--gold-200': `${brandingData.primaryColor}33`,
    };
  }

  const value = useMemo(() => ({
    branding: branding || DEFAULT_BRANDING,
    loading,
    hydrated,
    getCSSVariables: branding ? () => getCSSVariables(branding) : () => getCSSVariables(DEFAULT_BRANDING),
  }), [branding, loading, hydrated]);

  // Don't render children until hydrated to prevent flash
  if (!hydrated) {
    return null;
  }

  return (
    <BrandingCtx.Provider value={value}>
      {children}
    </BrandingCtx.Provider>
  );
}

export const useBranding = (): BrandingContextValue => {
  const ctx = useContext(BrandingCtx);
  if (!ctx) {
    throw new Error('useBranding must be used within BrandingProvider');
  }
  return ctx;
};
