import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EscrowPage from '../../pages/EscrowPage';

vi.mock('../../utils/helpers', () => ({
  timeAgo: vi.fn(() => '2mo ago'),
  formatDate: vi.fn(() => 'Jan 15, 2024'),
  formatKES: vi.fn((v) => `KES ${(v / 1000).toFixed(0)}K`),
}));
vi.mock('../../api/api', () => ({
  escrowAPI: {
    mine: vi.fn().mockResolvedValue({ escrows: [
      { id: 'e1', status: 'funded', amount: 3200000, car: { title: 'Toyota Land Cruiser GX-R 2024' }, createdAt: '2024-01-15', updatedAt: '2024-01-15' },
      { id: 'e2', status: 'pending', amount: 5800000, car: { title: 'Mercedes GLE 450 2023' }, createdAt: '2024-01-10', updatedAt: '2024-01-10' },
    ] }),
  },
  formatKES: vi.fn((v) => `KES ${(v / 1000).toFixed(0)}K`),
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ isAuth: true, user: { _id: 'u1', name: 'TestUser' } }),
}));
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('../../context/SocketContext', () => ({
  useSocket: () => ({ on: vi.fn(), off: vi.fn(), connected: true }),
}));

describe('EscrowPage', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('renders escrow heading', () => {
    render(<MemoryRouter><EscrowPage /></MemoryRouter>);
    expect(screen.getByText('🔒 Escrow Vault')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<MemoryRouter><EscrowPage /></MemoryRouter>);
    expect(screen.getByText(/protected by M-Pesa escrow/i)).toBeInTheDocument();
  });

  it('displays escrow transactions', async () => {
    render(<MemoryRouter><EscrowPage /></MemoryRouter>);
    expect(await screen.findByText('Toyota Land Cruiser GX-R 2024')).toBeInTheDocument();
    expect(await screen.findByText('Mercedes GLE 450 2023')).toBeInTheDocument();
  });
});
