import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OperationsControlRoom from '../../../pages/admin/OperationsControlRoom';

vi.mock('../../../api/api', () => ({
  adminAPI: {
    getOperationsMetrics: vi.fn().mockResolvedValue({
      totalUsers: 2847,
      totalDealers: 156,
      totalCars: 1842,
      activeEscrows: 34,
      totalUsersTrend: 12,
      totalDealersTrend: 8,
      totalCarsTrend: -3,
      activeEscrowsTrend: 5,
      activeUsers: 142,
      pageViews: 12450,
      apiRequestsPerMin: 89,
      escrowSuccessRate: 98.5,
      avgTransactionTime: '4.2m',
      disputesLastWeek: 2,
      pendingApprovals: 8,
      newListingsToday: 23,
      openTickets: 12,
      alerts: [
        { id: 'alert-1', severity: 'warning', message: 'High escrow volume detected', category: 'Finance', timestamp: new Date() },
      ],
      activity: [
        { id: 'act-1', message: 'Escrow released: KES 8.5M', source: 'Finance', timestamp: new Date(), icon: '💰' },
      ],
      systemHealth: [
        { label: 'API Response', value: 99.2, status: 'healthy' },
      ],
    }),
  },
}));

vi.mock('../../../context/SocketContext', () => ({
  useSocket: () => ({
    connected: true,
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  }),
}));

vi.mock('../../../context/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn(), info: vi.fn(), warning: vi.fn(), error: vi.fn() }),
}));

describe('OperationsControlRoom', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('renders operations control room title', async () => {
    render(<MemoryRouter><OperationsControlRoom /></MemoryRouter>);
    expect(await screen.findByText('Operations Control Room')).toBeInTheDocument();
  });

  it('loads operations metrics from API', async () => {
    const { adminAPI } = await import('../../../api/api');

    render(<MemoryRouter><OperationsControlRoom /></MemoryRouter>);

    await waitFor(() => {
      expect(adminAPI.getOperationsMetrics).toHaveBeenCalled();
    });
  });

  it('displays metric cards with values', async () => {
    render(<MemoryRouter><OperationsControlRoom /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('Active Dealers')).toBeInTheDocument();
    });
  });

  it('displays recent alerts panel', async () => {
    render(<MemoryRouter><OperationsControlRoom /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Recent Alerts')).toBeInTheDocument();
    });
  });

  it('displays live activity feed', async () => {
    render(<MemoryRouter><OperationsControlRoom /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Live Activity Feed')).toBeInTheDocument();
    });
  });

  it('shows refresh button', async () => {
    render(<MemoryRouter><OperationsControlRoom /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
  });
});
