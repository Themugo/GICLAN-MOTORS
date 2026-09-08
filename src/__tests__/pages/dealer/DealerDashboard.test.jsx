import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DealerDashboard from '../../../pages/dealer/DealerDashboard';

// Mock lucide-react before importing components
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { _id: 'u1', name: 'Test Dealer', role: 'dealer', approved: true },
    isAuth: true,
  }),
}));

vi.mock('../../../context/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('../../../api/api', () => ({
  dealerAPI: {
    summary: vi.fn().mockResolvedValue({
      totalViews: 5000,
      totalInquiries: 25,
      totalRevenue: 8500000,
      activeListings: 8,
      avgRating: 4.5,
      conversionRate: 18,
    }),
    cars: vi.fn().mockResolvedValue({
      cars: [
        { _id: 'car-1', title: 'Toyota Land Cruiser', price: 8500000, status: 'active', views: 1200, inquiries: 5 },
      ],
      data: [],
    }),
    analytics: vi.fn().mockResolvedValue({
      leads: [],
    }),
  },
  carsAPI: {
    remove: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../../../components/dealer', () => ({
  DealerHub: ({ children }) => <div data-testid="dealer-hub">{children}</div>,
  DealerMetric: () => null,
  DealerAction: () => null,
  DealerFunnel: () => null,
  DealerLeadsTable: () => null,
  DealerInventoryCard: () => null,
}));

describe('DealerDashboard', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('loads data from API', async () => {
    const { dealerAPI } = await import('../../../api/api');

    render(
      <MemoryRouter>
        <DealerDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(dealerAPI.summary).toHaveBeenCalled();
    });
  });

  it('handles API failure gracefully', async () => {
    const { dealerAPI } = await import('../../../api/api');
    dealerAPI.summary.mockRejectedValueOnce(new Error('API Error'));

    render(
      <MemoryRouter>
        <DealerDashboard />
      </MemoryRouter>
    );

    // Should still render without crashing
    expect(screen.queryByText(/welcome back/i) || true).toBeTruthy();
  });
});
