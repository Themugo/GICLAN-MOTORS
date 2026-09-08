import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PaymentHistoryView from '../features/PaymentHistoryView';

const paymentMocks = vi.hoisted(() => ({ myPayments: vi.fn(), status: vi.fn() }));
const myPayments = paymentMocks.myPayments;
const status = paymentMocks.status;

vi.mock('../api/api', () => ({ paymentsAPI: paymentMocks }));
vi.mock('../utils/helpers', () => ({
  formatKES: (value: number | string) => `KES ${Number(value).toLocaleString('en-KE')}`,
  timeAgo: () => 'today',
}));

describe('PaymentHistoryView', () => {
  beforeEach(() => {
    myPayments.mockReset();
    status.mockReset();
  });

  it('loads and renders real payment rows from the payment history API', async () => {
    myPayments.mockResolvedValue({
      payments: [{
        id: 'payment-1',
        amount: 125000,
        type: 'escrow',
        status: 'success',
        mpesaReceipt: 'QAB123',
        createdAt: '2026-09-03T08:00:00Z',
        car: { title: 'Toyota Land Cruiser' },
      }],
      pagination: { page: 1, limit: 10, total: 1, pages: 1 },
    });

    render(<PaymentHistoryView />);

    expect(await screen.findByText('Toyota Land Cruiser')).toBeInTheDocument();
    expect(screen.getAllByText('KES 125,000').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Completed').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('QAB123')).toBeInTheDocument();
    expect(myPayments).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });

  it('renders an honest empty state when the API has no records', async () => {
    myPayments.mockResolvedValue({ payments: [], pagination: { page: 1, limit: 10, total: 0, pages: 1 } });

    render(<PaymentHistoryView />);

    expect(await screen.findByText('No payment records found')).toBeInTheDocument();
  });

  it('shows a retryable error when the API fails', async () => {
    myPayments.mockRejectedValue(new Error('network down'));

    render(<PaymentHistoryView />);

    await waitFor(() => expect(screen.getByText('network down')).toBeInTheDocument());
  });
});
