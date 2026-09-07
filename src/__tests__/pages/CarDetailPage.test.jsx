import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CarDetailPage from '../../pages/CarDetail';
import { MarketplaceProvider } from '../../context/MarketplaceContext';

vi.mock('../../hooks/usePageMeta', () => ({ default: () => {} }));

// CarDetailPage fetches the car via carsAPI.get(id) — there is no demo-data
// fallback in the component anymore (demo mode was intentionally removed),
// so the mock resolves the real data path directly instead.
const mockCars = [
  { id: 'car-1', title: 'Test Luxury Car', brand: 'BMW', model: 'X5',
    year: 2023, fuel: 'Petrol', transmission: 'Automatic',
    price: 8500000, images: [], dealer: { _id: 'd1', name: 'Test Dealer' } },
  { id: 'car-2', title: 'Another Car', brand: 'BMW', model: 'X3',
    year: 2022, fuel: 'Diesel', transmission: 'Automatic',
    price: 6500000, images: [], dealer: { _id: 'd1', name: 'Test Dealer' } },
];

vi.mock('../../api/api', () => {
  return {
    carsAPI: {
      get: vi.fn().mockResolvedValue({
        car: {
          _id: 'car-1', title: 'Test Luxury Car', brand: 'BMW', model: 'X5',
          year: 2023, fuel: 'Petrol', transmission: 'Automatic',
          price: 8500000, images: [], dealer: { _id: 'd1', name: 'Test Dealer' },
        },
      }),
      list: vi.fn().mockResolvedValue({ data: [] }),
      trackClick: vi.fn().mockResolvedValue({}),
      promote: vi.fn(),
    },
    reviewsAPI: {
      forDealer: vi.fn().mockResolvedValue({ reviews: [] }),
      create: vi.fn(),
    },
    chatAPI: { start: vi.fn() },
    ntsaAPI: { status: vi.fn().mockRejectedValue({}) },
    favoritesAPI: { list: vi.fn().mockResolvedValue({}), toggle: vi.fn(), setPriceAlert: vi.fn() },
    bidsAPI: { getForCar: vi.fn().mockResolvedValue({ bids: [] }), place: vi.fn() },
    formatKES: vi.fn(v => `KES ${(v / 1000).toFixed(0)}K`),
    MOCK_CARS: [
      { id: 'car-1', title: 'Test Luxury Car', brand: 'BMW', model: 'X5',
        year: 2023, fuel: 'Petrol', transmission: 'Automatic',
        price: 8500000, images: [], dealer: { _id: 'd1', name: 'Test Dealer' } },
      { id: 'car-2', title: 'Another Car', brand: 'BMW', model: 'X3',
        year: 2022, fuel: 'Diesel', transmission: 'Automatic',
        price: 6500000, images: [], dealer: { _id: 'd1', name: 'Test Dealer' } },
    ],
  };
});
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'u1' }, isAuth: true, isAdmin: false }),
  useOptionalAuth: () => ({ user: { _id: 'u1' }, isAuth: true, isAdmin: false }),
}));
vi.mock('../../context/CompareContext', () => ({
  useCompare: () => ({ isComparing: () => false, toggleCar: vi.fn(), compareCount: 0 }),
}));
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('../../components/BackButton', () => ({ default: () => null }));
vi.mock('../../components/PaymentModal', () => ({ default: () => null }));
vi.mock('../../components/InspectionButton', () => ({ default: () => null }));
vi.mock('../../components/TcoCalculator', () => ({ default: () => null }));
vi.mock('../../components/MarketValuationMatrix', () => ({ default: () => null }));
vi.mock('../../components/MarketPulse', () => ({ default: () => null }));
vi.mock('../../components/PriceHistoryChart', () => ({ default: () => null }));
vi.mock('../../components/features/car/GalleryModal', () => ({ default: () => null }));
vi.mock('../../components/SeoStructuredData', () => ({
  VehicleStructuredData: () => null,
  BreadcrumbStructuredData: () => null,
}));
vi.mock('../../components/SEOHead', () => ({ default: () => null }));
vi.mock('../../pages/car/components/DetailSkeleton', () => ({ default: () => null }));
vi.mock('../../pages/car/components/AuctionAnnouncement', () => ({ default: () => null }));
vi.mock('../../pages/car/components/InlineBidding', () => ({ default: () => null }));
vi.mock('../../pages/car/components/NtsaStatusCard', () => ({ default: () => null }));
vi.mock('../../pages/car/components/CarDetailWidgets', () => ({
  GalleryImage: () => null,
  SpecItem: () => null,
  CompareToggle: () => null,
  firstImage: () => '',
}));
vi.mock('../../pages/car/components/CarDetailReviews', () => ({ default: () => null }));

describe('CarDetailPage', () => {
  afterEach(() => { cleanup(); });

  it('renders car title from mock', async () => {
    render(<MemoryRouter initialEntries={['/cars/veh_1']}><MarketplaceProvider><CarDetailPage /></MarketplaceProvider></MemoryRouter>);
    const titles = await screen.findAllByText(/Test Luxury Car/);
    expect(titles.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Chat Dealer button', async () => {
    render(<MemoryRouter initialEntries={['/cars/veh_1']}><MarketplaceProvider><CarDetailPage /></MarketplaceProvider></MemoryRouter>);
    const buttons = await screen.findAllByText('Chat Dealer');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });
});
