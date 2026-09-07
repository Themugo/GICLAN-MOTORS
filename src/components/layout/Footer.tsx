import { useNavigate } from 'react-router-dom';
import { useDesignTheme } from '../../theme/DesignThemeProvider';

interface FooterProps {
  setPage: (page: string) => void;
}

const ROUTES: Record<string, string> = {
  home: '/home',
  gallery: '/gallery',
  auction: '/auction',
  'pre-inspection': '/pre-inspection',
  register: '/register',
  escrow: '/escrow',
  support: '/support',
  about: '/about',
};

export default function Footer({ setPage }: FooterProps) {
  const navigate = useNavigate();
  const { theme } = useDesignTheme();
  const { colors, layouts } = theme;
  const layout = layouts.footer;

  const nav = (page: string) => {
    setPage(page);
    const path = ROUTES[page] || `/${page}`;
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const columns = [
    {
      title: 'Marketplace',
      links: [
        { label: 'Browse Cars', page: 'gallery' },
        { label: 'Live Auctions', page: 'auction' },
        { label: 'Sell Your Vehicle', page: 'register' },
        { label: 'Escrow Vault', page: 'escrow' },
      ],
    },
    {
      title: 'Services',
      links: [
        { label: 'Pre-Inspection', page: 'pre-inspection' },
        { label: 'Car Financing', page: 'support' },
        { label: 'Insurance', page: 'support' },
        { label: 'Become a Dealer', page: 'support' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About KAYAD', page: 'about' },
        { label: 'How It Works', page: 'home' },
        { label: 'Support', page: 'support' },
        { label: 'Contact', page: 'support' },
      ],
    },
  ];

  const gridCols = () => {
    if (layout === 'centered') return '1fr';
    if (layout === 'two-col') return 'repeat(2, 1fr)';
    if (layout === 'three-col') return 'repeat(3, 1fr)';
    return 'repeat(4, 1fr)';
  };

  const showBrand = layout === 'four-col' || layout === 'three-col' || layout === 'two-col';
  const showColumns = layout === 'four-col' ? columns : layout === 'three-col' ? columns.slice(0, 2) : layout === 'two-col' ? columns.slice(0, 1) : columns;
  const brandSpan = layout === 'four-col' ? 1 : 0;

  return (
    <footer
      style={{
        backgroundColor: colors.footerBg,
        color: colors.footerText,
        borderTop: `2px solid ${colors.footerAccent}40`,
        fontFamily: 'var(--font-body)',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '56px 24px 32px',
        }}
      >
        {layout === 'centered' ? (
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <button
              onClick={() => nav('home')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  backgroundColor: colors.footerAccent,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={colors.footerBg}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 13l2-6h14l2 6" />
                  <path d="M1 17h22" />
                  <circle cx="7" cy="17" r="2" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
              </div>
              <span
                style={{
                  color: colors.footerAccent,
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  fontSize: 18,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase' as const,
                }}
              >
                KAYAD
              </span>
            </button>
            <p style={{ fontSize: 13, opacity: 0.5, maxWidth: 400, margin: '0 auto 24px', lineHeight: 1.6 }}>
              Kenya's premium car marketplace. Buy, sell, and auction vehicles with M-Pesa escrow protection.
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap' as const,
                justifyContent: 'center',
                gap: 24,
                marginBottom: 40,
              }}
            >
              {columns.map(col =>
                col.links.map(link => (
                  <button
                    key={link.label}
                    onClick={() => nav(link.page)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: colors.footerText,
                      opacity: 0.5,
                      fontSize: 13,
                      fontFamily: 'var(--font-body)',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'opacity 0.2s, color 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.color = colors.footerAccent;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.opacity = '0.5';
                      e.currentTarget.style.color = colors.footerText;
                    }}
                  >
                    {link.label}
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: gridCols(),
              gap: 40,
              marginBottom: 40,
            }}
          >
            {showBrand && (
              <div>
                <button
                  onClick={() => nav('home')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 12,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      backgroundColor: colors.footerAccent,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={colors.footerBg}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 13l2-6h14l2 6" />
                      <path d="M1 17h22" />
                      <circle cx="7" cy="17" r="2" />
                      <circle cx="17" cy="17" r="2" />
                    </svg>
                  </div>
                  <span
                    style={{
                      color: colors.footerAccent,
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 700,
                      fontSize: 16,
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase' as const,
                    }}
                  >
                    KAYAD
                  </span>
                </button>
                <p style={{ fontSize: 13, opacity: 0.4, lineHeight: 1.6 }}>
                  Kenya's premium car marketplace. Buy, sell, and auction vehicles with M-Pesa escrow protection.
                </p>
              </div>
            )}

            {showColumns.map(col => (
              <div key={col.title}>
                <h4
                  style={{
                    color: colors.footerAccent,
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 600,
                    fontSize: 14,
                    marginBottom: 16,
                    letterSpacing: '0.05em',
                  }}
                >
                  {col.title}
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {col.links.map(link => (
                    <li key={link.label}>
                      <button
                        onClick={() => nav(link.page)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: colors.footerText,
                          opacity: 0.4,
                          fontSize: 13,
                          fontFamily: 'var(--font-body)',
                          cursor: 'pointer',
                          padding: 0,
                          transition: 'opacity 0.2s, color 0.2s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.color = colors.footerAccent;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.opacity = '0.4';
                          e.currentTarget.style.color = colors.footerText;
                        }}
                      >
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            borderTop: `1px solid ${colors.footerAccent}30`,
            paddingTop: 24,
            display: 'flex',
            flexWrap: 'wrap' as const,
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <p style={{ fontSize: 12, opacity: 0.3, margin: 0 }}>
            &copy; {new Date().getFullYear()} KAYAD Motors Kenya Ltd. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Privacy Policy', 'Terms of Service', 'Support'].map(item => (
              <button
                key={item}
                onClick={() => nav('support')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.footerText,
                  opacity: 0.3,
                  fontSize: 12,
                  fontFamily: 'var(--font-body)',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'opacity 0.2s, color 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.color = colors.footerAccent;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.opacity = '0.3';
                  e.currentTarget.style.color = colors.footerText;
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
