import { Link, useLocation } from 'react-router-dom';
import { Home, Search, PlusCircle, Trophy, User, Heart, BarChart3 } from 'lucide-react';

interface MobileBottomNavProps {
  authUser?: any;
}

export default function MobileBottomNav({ authUser }: MobileBottomNavProps) {
  const location = useLocation();
  const path = location.pathname;

  // Hide on desktop or admin/dealer routes
  if (
    window.innerWidth >= 1024 ||
    path.startsWith('/dealer') ||
    path.startsWith('/admin') ||
    path.startsWith('/dashboard')
  ) {
    return null;
  }

  const isActive = (href: string) => {
    if (href === '/') return path === '/';
    return path.startsWith(href);
  };

  const tabs = [
    { key: 'home', href: '/', icon: Home, label: 'Home' },
    { key: 'search', href: '/gallery', icon: Search, label: 'Search' },
    { key: 'favorites', href: '/favorites', icon: Heart, label: 'Saved' },
    { key: 'compare', href: '/compare', icon: BarChart3, label: 'Compare' },
    { key: 'account', href: authUser ? '/dashboard' : '/sign-in', icon: User, label: authUser ? 'Account' : 'Sign In' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[999] bg-charcoal-950 border-t border-white/5 pb-safe flex h-16 lg:hidden">
      {tabs.map(tab => {
        const active = isActive(tab.href);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.key}
            to={tab.href}
            className={`
              flex-1 flex flex-col items-center justify-center gap-0.5
              text-[10px] font-semibold no-underline transition-colors
              ${active ? 'text-gold-400' : 'text-white/35'}
            `}
          >
            <Icon size={20} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
