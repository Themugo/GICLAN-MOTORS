import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, PlusCircle, User, Heart, BarChart3 } from 'lucide-react';

interface MobileBottomNavProps {
  authUser?: any;
}

export default function MobileBottomNav({ authUser }: MobileBottomNavProps) {
  const location = useLocation();
  const path = location.pathname;
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (
    !isMobile ||
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

  const getAccountHref = () => {
    if (!authUser) return '/login';
    const role = authUser.role;
    if (role === 'admin') return '/admin';
    if (role === 'dealer') return '/dealer';
    return '/dashboard';
  };

  const tabs = [
    { key: 'home', href: '/', icon: Home, label: 'Home' },
    { key: 'gallery', href: '/gallery', icon: Search, label: 'Search' },
    { key: 'sell', href: '/dealer/add-car', icon: PlusCircle, label: 'Sell' },
    { key: 'favorites', href: '/favorites', icon: Heart, label: 'Saved' },
    { key: 'account', href: getAccountHref(), icon: User, label: authUser ? 'Account' : 'Sign In' },
  ];

  const PREFETCH_ROUTES: Record<string, () => Promise<any>> = {
    gallery: () => import('../../pages/Gallery'),
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[999] bg-charcoal-950 border-t border-white/5 pb-safe flex h-16 lg:hidden">
      {tabs.map(tab => {
        const active = isActive(tab.href);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.key}
            to={tab.href}
            onPointerEnter={() => PREFETCH_ROUTES[tab.key]?.()}
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
