import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '../../components/Navbar';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { _id: 'u1', name: 'TestUser', role: 'dealer' },
    isAuth: true,
    isAdmin: false,
    logout: vi.fn(),
  }),
}));
vi.mock('../../context/SocketContext', () => ({
  useSocket: () => ({ connected: true }),
}));
vi.mock('../../context/NotificationContext', () => ({
  useNotifications: () => ({ unreadCount: 3 }),
}));
vi.mock('../../context/BrandingContext', () => ({
  useBranding: () => ({
    branding: { logoType: 'icon', logoText: 'KAYAD' },
    loading: false,
    hydrated: true,
  }),
}));
vi.mock('../../api/api', () => ({
  carsAPI: { list: vi.fn().mockResolvedValue({ data: [] }) },
  notifAPI: { list: vi.fn().mockResolvedValue({ notifications: [] }) },
}));
vi.mock('../../utils/helpers', () => ({ initials: () => 'TU' }));
vi.mock('../../utils/authRoutes', () => ({ isSellerRole: () => false }));
vi.mock('../../components/features/common/NotificationCenter', () => ({ default: () => null }));
vi.mock('framer-motion', () => ({
  motion: { div: ({ children, ...p }) => <div {...p}>{children}</div> },
  AnimatePresence: ({ children }) => children,
}));

describe('Navbar', () => {
  afterEach(() => { cleanup(); });

  it('renders KAYAD branding', () => {
    render(<MemoryRouter><Navbar currentPage="home" setPage={vi.fn()} authUser={null} onSignOut={vi.fn()} /></MemoryRouter>);
    expect(screen.getAllByText('KAYAD').length).toBeGreaterThan(0);
  });

  it('renders nav links', () => {
    render(<MemoryRouter><Navbar currentPage="home" setPage={vi.fn()} authUser={null} onSignOut={vi.fn()} /></MemoryRouter>);
    expect(screen.getAllByText('Marketplace').length).toBeGreaterThan(0);
  });
});
