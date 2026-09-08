
// Stitch Design System Card
// Aligns with Heritage Tech design language

export interface CardProps {
  children: React.ReactNode;
  padding?: 'sm' | 'md' | 'lg' | 'flush';
  interactive?: boolean;
  hoverEffect?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

// Stitch: 12px radius for cards, white background with subtle border
export const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  interactive = false,
  hoverEffect = false,
  className = '',
  style,
  onClick,
}) => {
  const paddingMap: Record<string, string> = {
    sm: 'var(--space-4)',
    md: 'var(--space-4)',
    lg: 'var(--space-6)',
    flush: '0',
  };

  // Stitch Design: Card with subtle shadow and border
  const baseStyle: React.CSSProperties = {
    display: 'block',
    padding: paddingMap[padding],
    background: 'var(--surface-container-lowest, #ffffff)',
    border: '1px solid var(--surface-dim)',
    borderRadius: 'var(--radius-lg)', // Stitch: 12px for cards
    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
    // Stitch: Hover animation - translate -2px
    transition: 'transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease',
    cursor: interactive || onClick ? 'pointer' : 'default',
  };

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={className}
      style={baseStyle}
      onClick={onClick}
    >
      {children}
    </Component>
  );
};

export default Card;

// Card Header Component
export interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  className = '',
  style,
}) => {
  // Stitch Design: Clean header with bottom border
  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--space-4)',
    paddingBottom: 'var(--space-4)',
    marginBottom: 'var(--space-4)',
    borderBottom: '1px solid var(--outline-variant)',
  };

  // Stitch: Playfair Display for card titles
  const titleStyle: React.CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-xl)',
    fontWeight: 600,
    color: 'var(--on-surface)',
    margin: 0,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: 'var(--text-sm)',
    color: 'var(--on-surface-variant)',
    margin: 'var(--space-1) 0 0 0',
  };

  return (
    <div className={className} style={{ ...headerStyle, ...style }}>
      <div>
        <h3 style={titleStyle}>{title}</h3>
        {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

// Card Footer Component
export interface CardFooterProps {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
  style?: React.CSSProperties;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  align = 'right',
  className = '',
  style,
}) => {
  const footerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
    gap: 'var(--space-3)',
    paddingTop: 'var(--space-4)',
    marginTop: 'var(--space-4)',
    borderTop: '1px solid var(--outline-variant)',
  };

  return (
    <div className={className} style={{ ...footerStyle, ...style }}>
      {children}
    </div>
  );
};
