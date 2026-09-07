import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Showroom from '../../pages/Showroom';

vi.mock('../../hooks/usePageMeta', () => ({ default: () => {} }));
vi.mock('../../hooks/useMediaQuery', () => ({ default: () => false }));
vi.mock('../../hooks/useIntersectionObserver', () => ({ default: () => [null, {}] }));
vi.mock('../../hooks/useDebouncedValue', () => ({ default: v => v }));
vi.mock('../../api/api', () => ({
  carsAPI: { list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0, pages: 1 } }) },
  savedSearchAPI: { list: vi.fn().mockResolvedValue({ searches: [] }) },
}));
vi.mock('../../context/SocketContext', () => ({
  useSocket: () => ({ joinShowroom: vi.fn(), on: vi.fn(() => vi.fn()), leaveShowroom: vi.fn() }),
}));
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('../../components/features/common/SearchSidebar', () => ({ default: () => null }));
vi.mock('../../components/features/car/CartyGrid', () => ({ default: () => null }));
vi.mock('../../components/features/common/SeoStructuredData', () => ({
  ItemListStructuredData: () => null,
  BreadcrumbStructuredData: () => null,
}));

describe('Showroom', () => {
  afterEach(() => { cleanup(); });

  it('renders page heading', () => {
    render(<MemoryRouter><Showroom /></MemoryRouter>);
    expect(screen.getByText(/Kenya's Premium Automotive Gallery/)).toBeInTheDocument();
  });

  it('renders The Gallery title', () => {
    render(<MemoryRouter><Showroom /></MemoryRouter>);
    expect(screen.getByText('The Gallery')).toBeInTheDocument();
  });

  it('shows the honest empty state when the real API returns no vehicles', async () => {
    render(<MemoryRouter><Showroom /></MemoryRouter>);
    expect(await screen.findByText(/No vehicles match this search/i)).toBeInTheDocument();
  });
});
