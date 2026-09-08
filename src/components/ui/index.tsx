import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Avatar from './Avatar';
import Progress from './Progress';
import Skeleton, { EmptyState } from './Skeleton';
import { Drawer as DesignDrawer } from '../../design-system/Drawer';

/* ==========================================================================
   KAYAD AUTOMOTIVE DESIGN SYSTEM TOKENS & REUSABLE COMPONENTS
   ========================================================================== */

// --- BUTTON COMPONENT ---
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger' | 'coral';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  fullWidth?: boolean;
  full?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  full = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold transition-all focus:outline-none focus:ring-2 focus:ring-[#1E3063]/50 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';
  
  const variantStyles = {
    primary: 'bg-[#1E3063] hover:bg-[#17244B] text-white shadow-sm',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80',
    accent: 'bg-amber-400 hover:bg-amber-500 text-[#17244B] shadow-sm',
    outline: 'border border-slate-300 hover:bg-slate-50 text-slate-700',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm',
    coral: 'bg-[#D96B43] hover:bg-[#c65a34] text-white shadow-sm'
  };

  const sizeStyles = {
    sm: 'text-[11px] px-3 py-1.5 rounded-lg gap-1.5',
    md: 'text-xs px-4 py-2.5 rounded-xl gap-2',
    lg: 'text-sm px-5 py-3 rounded-xl gap-2.5'
  };

  const widthStyle = fullWidth || full ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
};

// --- BADGE COMPONENT ---
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'verified' | 'inspected' | 'escrow' | 'live' | 'accent' | 'neutral' | 'success' | 'warning' | 'danger' | 'outline' | 'secondary' | 'blue' | 'green' | 'orange' | 'premium' | 'emerald' | 'amber';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'sm',
  children,
  className = '',
  icon,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-bold rounded-md backdrop-blur-md select-none';

  const variantStyles = {
    verified: 'bg-[#1E3063]/90 text-white border border-[#1E3063]',
    inspected: 'bg-emerald-600/95 text-white',
    escrow: 'bg-amber-500/95 text-[#17244B]',
    live: 'bg-rose-600 text-white animate-pulse',
    accent: 'bg-amber-400 text-[#17244B]',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200',
    outline: 'bg-transparent text-slate-600 border border-slate-300',
    secondary: 'bg-slate-200 text-slate-800 border border-slate-300',
    blue: 'bg-blue-50 text-blue-700 border border-blue-200',
    green: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    orange: 'bg-orange-50 text-orange-700 border border-orange-200',
    premium: 'bg-amber-400 text-[#17244B] border border-amber-300',
    emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    amber: 'bg-amber-50 text-amber-800 border border-amber-200'
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5'
  };

  return (
    <span className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`} {...props}>
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
};

// --- CARD COMPONENTS ---
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, hoverable = false, className = '', ...props }) => {
  const hoverStyle = hoverable ? 'hover:shadow-card-hover hover:border-slate-300' : '';
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 shadow-card transition-all duration-300 overflow-hidden ${hoverStyle} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={`p-5 pb-3 border-b border-slate-100 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ children, className = '', ...props }) => (
  <h3 className={`text-base font-bold text-[#1E3063] font-display ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ children, className = '', ...props }) => (
  <p className={`text-xs text-slate-500 mt-0.5 font-medium ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={`p-5 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={`p-5 pt-3 border-t border-slate-100 ${className}`} {...props}>
    {children}
  </div>
);

// --- FORM INPUT COMPONENTS ---
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, icon, className = '', ...props }) => (
  <div className="space-y-1 w-full">
    {label && (
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
        {label}
      </label>
    )}
    <div className="relative flex items-center">
      {icon && <div className="absolute left-3.5 text-slate-400 pointer-events-none">{icon}</div>}
      <input
        className={`w-full px-3.5 py-2.5 bg-slate-50 text-slate-800 placeholder-slate-400 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1E3063] focus:bg-white transition-all ${
          icon ? 'pl-10' : ''
        } ${error ? 'border-rose-400 ring-rose-200' : ''} ${className}`}
        {...props}
      />
    </div>
    {error && <p className="text-[10px] text-rose-600 font-bold">{error}</p>}
  </div>
);

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: { value: string; label: string }[];
  children?: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({ label, options, children, className = '', ...props }) => (
  <div className="space-y-1 w-full">
    {label && (
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
        {label}
      </label>
    )}
    <select
      className={`w-full px-3.5 py-2.5 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1E3063] focus:bg-white cursor-pointer transition-all ${className}`}
      {...props}
    >
      {options
        ? options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))
        : children}
    </select>
  </div>
);

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, className = '', ...props }) => (
  <div className="space-y-1 w-full">
    {label && (
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
        {label}
      </label>
    )}
    <textarea
      className={`w-full p-3 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1E3063] focus:bg-white transition-all ${className}`}
      {...props}
    />
  </div>
);

// --- TABLE COMPONENTS ---
export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({ children, className = '', ...props }) => (
  <div className="overflow-x-auto w-full">
    <table className={`w-full text-left text-xs border-collapse ${className}`} {...props}>
      {children}
    </table>
  </div>
);

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, className = '', ...props }) => (
  <thead className={`border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px] bg-slate-50/50 ${className}`} {...props}>
    {children}
  </thead>
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, className = '', ...props }) => (
  <tbody className={`divide-y divide-slate-100 ${className}`} {...props}>
    {children}
  </tbody>
);

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ children, className = '', ...props }) => (
  <th className={`p-3 font-bold ${className}`} {...props}>
    {children}
  </th>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ children, className = '', ...props }) => (
  <tr className={`hover:bg-slate-50/70 transition-colors ${className}`} {...props}>
    {children}
  </tr>
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ children, className = '', ...props }) => (
  <td className={`p-3 font-medium text-slate-700 ${className}`} {...props}>
    {children}
  </td>
);

// --- MODAL / DIALOG COMPONENT ---
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md'
}) => {
  if (!isOpen) return null;

  const widthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl'
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className={`bg-white rounded-2xl w-full ${widthStyles[maxWidth]} max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 relative animate-fade-in`}>
        {title && (
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div className="font-bold text-[#1E3063] font-display text-base">{title}</div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// --- ENTERPRISE PAGE HEADER BANNER COMPONENT ---
export interface PageHeaderProps {
  badgeIcon?: React.ReactNode;
  badgeText: string;
  title: string;
  description: string;
  rightElement?: React.ReactNode;
  variant?: 'navy' | 'white';
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  badgeIcon,
  badgeText,
  title,
  description,
  rightElement,
  variant = 'white'
}) => {
  if (variant === 'navy') {
    return (
      <div className="bg-[#1E3063] text-white rounded-2xl p-6 md:p-8 shadow-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
            {badgeIcon} {badgeText}
          </div>
          <h2 className="text-2xl font-extrabold font-display">{title}</h2>
          <p className="text-slate-300 text-xs mt-1 max-w-2xl leading-relaxed">{description}</p>
        </div>
        {rightElement && <div className="shrink-0">{rightElement}</div>}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-[#1E3063] uppercase tracking-wider mb-1">
          {badgeIcon} {badgeText}
        </div>
        <h2 className="text-2xl font-extrabold text-[#1E3063] font-display">{title}</h2>
        <p className="text-slate-600 text-xs mt-1 max-w-xl">{description}</p>
      </div>
      {rightElement && <div className="shrink-0">{rightElement}</div>}
    </div>
  );
};

// --- SKELETON LOADING PLACEHOLDERS ---
export const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-pulse space-y-4">
    <div className="h-52 bg-slate-200/80 w-full relative" />
    <div className="p-5 space-y-4">
      <div className="space-y-2">
        <div className="h-3 bg-slate-200 rounded w-1/3" />
        <div className="h-5 bg-slate-200 rounded w-3/4" />
        <div className="h-7 bg-slate-200 rounded w-1/2" />
      </div>
      <div className="grid grid-cols-3 gap-2 bg-slate-100 p-2.5 rounded-xl h-12" />
      <div className="flex gap-2 pt-1">
        <div className="h-9 bg-slate-200 rounded-xl flex-1" />
        <div className="h-9 bg-slate-200 rounded-xl w-28" />
      </div>
    </div>
  </div>
);

export const SkeletonGrid: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

// --- KPI STATS WIDGET ---
export interface StatWidgetProps {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  subtext?: string;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral' | 'warning';
}

export const StatWidget: React.FC<StatWidgetProps> = ({ label, value, icon, subtext, trend, trendType = 'neutral' }) => {
  const trendColor = {
    positive: 'text-emerald-700',
    negative: 'text-rose-600',
    warning: 'text-amber-700',
    neutral: 'text-slate-500'
  }[trendType];

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card space-y-1">
      <div className="flex items-center justify-between text-slate-400">
        <span className="text-[10px] uppercase font-bold tracking-wider">{label}</span>
        <div className="w-5 h-5 flex items-center justify-center">{icon}</div>
      </div>
      <p className="text-2xl font-black text-[#1E3063] font-display">{value}</p>
      {trend && <p className={`text-[10px] font-bold ${trendColor}`}>{trend}</p>}
      {!trend && subtext && <p className="text-[10px] text-slate-500 font-medium">{subtext}</p>}
    </div>
  );
};

export const PageSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-24 bg-slate-200/80 rounded-2xl w-full" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 bg-slate-200/60 rounded-2xl" />
      ))}
    </div>
    <div className="h-64 bg-slate-200/60 rounded-2xl w-full" />
  </div>
);

// --- INTERSECTION OBSERVER LAZY IMAGE ---
export interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
}

export const Image: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  wrapperClassName = '',
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px 0px' }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${wrapperClassName}`}>
      {(!isLoaded || !isInView) && !hasError && (
        <div className="absolute inset-0 bg-slate-200/80 animate-pulse flex items-center justify-center z-0">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-amber-500 rounded-full animate-spin opacity-50" />
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center text-slate-400 p-2 text-center text-xs font-semibold">
          <span>Image unavailable</span>
        </div>
      )}

      {isInView && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          {...props}
        />
      )}
    </div>
  );
};

// Export Image as LazyImage for backward compatibility
export const LazyImage = Image;



// --- LEGACY MARKETPLACE COMPATIBILITY PRIMITIVES ---
// These primitives remain intentionally small and data-agnostic. They preserve the
// established page contracts while keeping the canonical design-system components
// above as the source of truth for styling and behavior.
export interface PriceTagProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  sub?: React.ReactNode;
}

export const PriceTag: React.FC<PriceTagProps> = ({ value, size = 'md', sub }) => {
  const sizes = { sm: 'text-sm', md: 'text-lg', lg: 'text-2xl' };
  return (
    <div>
      <div className={`${sizes[size]} font-extrabold text-[#1E3063]`}>
        KES {Number(value || 0).toLocaleString('en-KE')}
      </div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
};

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export const Breadcrumb: React.FC<{ items: BreadcrumbItem[] }> = ({ items }) => (
  <nav aria-label="Breadcrumb" className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
    {items.map((item, index) => (
      <React.Fragment key={`${item.label}-${index}`}>
        {index > 0 && <span aria-hidden="true">/</span>}
        {item.href ? <a href={item.href} className="hover:text-[#1E3063]">{item.label}</a> : <span className="text-slate-700 font-semibold">{item.label}</span>}
      </React.Fragment>
    ))}
  </nav>
);

export const MapPlaceholder: React.FC<{ label?: string; pin?: React.ReactNode; height?: number }> = ({
  label = 'Location', pin = '📍', height = 180,
}) => (
  <div
    role="img"
    aria-label={label}
    className="rounded-xl border border-slate-200 bg-slate-100 flex flex-col items-center justify-center text-slate-500"
    style={{ height }}
  >
    <span className="text-2xl">{pin}</span>
    <span className="text-xs font-semibold mt-2">{label}</span>
  </div>
);

export interface StatCardProps {
  icon?: React.ReactNode;
  iconVariant?: string;
  label: string;
  value: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ icon, label, value }) => (
  <Card className="p-4">
    <div className="flex items-center gap-3">
      {icon && <div className="text-xl" aria-hidden="true">{icon}</div>}
      <div>
        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{label}</div>
        <div className="text-lg font-extrabold text-[#1E3063]">{value}</div>
      </div>
    </div>
  </Card>
);

export const FilterChip: React.FC<{
  label: string;
  active?: boolean;
  onToggle?: () => void;
  onRemove?: () => void;
}> = ({ label, active = false, onToggle, onRemove }) => (
  <button type="button" onClick={onRemove || onToggle} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${active ? 'bg-[#1E3063] text-white border-[#1E3063]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
    {label}{active && onRemove && <span aria-hidden="true">×</span>}
  </button>
);

export const RangeSlider: React.FC<{
  label?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
}> = ({ label, min, max, step = 1, value, onChange }) => (
  <label className="block">
    {label && <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">{label}</span>}
    <input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full" />
    <span className="block text-xs font-semibold text-slate-600 mt-1">{Number(value).toLocaleString('en-KE')}</span>
  </label>
);

export const Segmented: React.FC<{
  options: Array<{ id?: string; value?: string; label?: string; icon?: React.ReactNode }>;
  value: string;
  onChange: (value: string) => void;
}> = ({ options, value, onChange }) => (
  <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1">
    {options.map(option => {
      const key = option.id ?? option.value ?? option.label;
      return <button key={key} type="button" onClick={() => onChange(key)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${value === key ? 'bg-white shadow-sm text-[#1E3063]' : 'text-slate-500'}`}>{option.icon ?? option.label}</button>;
    })}
  </div>
);

export const Drawer: React.FC<React.ComponentProps<typeof DesignDrawer> & { open?: boolean }> = ({ open, isOpen, ...props }) => (
  <DesignDrawer isOpen={open ?? isOpen} {...props} />
);

export { Avatar, Progress, EmptyState, Skeleton };
