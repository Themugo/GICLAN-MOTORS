import { useCallback } from 'react';

interface SkipLinkProps {
  targetId?: string;
  label?: string;
  className?: string;
}

export default function SkipLink({
  targetId = 'main-content',
  label = 'Skip to main content',
  className = ''
}: SkipLinkProps) {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.tabIndex = -1;
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [targetId]);

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={`
        fixed top-4 left-4 z-[100]
        px-4 py-2
        bg-gold-500 text-charcoal-900
        font-sans font-semibold text-sm
        rounded-lg shadow-lg
        transform -translate-y-full opacity-0
        focus:translate-y-0 focus:opacity-100
        transition-all duration-200
        hover:bg-gold-600
        ${className}
      `}
    >
      {label}
    </a>
  );
}

// Live region for announcements
interface LiveRegionProps {
  politeness?: 'polite' | 'assertive';
  children: React.ReactNode;
}

export function LiveRegion({
  politeness = 'polite',
  children
}: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {children}
    </div>
  );
}

// Screen reader only text
export function VisuallyHidden({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`sr-only ${className}`}>
      {children}
    </span>
  );
}

// Accessible link that opens in new tab
interface ExternalLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode;
}

export function ExternalLink({
  children,
  href,
  className = '',
  ...props
}: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      {...props}
    >
      {children}
      <VisuallyHidden>(opens in new tab)</VisuallyHidden>
    </a>
  );
}
