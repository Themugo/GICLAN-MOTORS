import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVehicleCollections } from '../../hooks/useVehicleCollections';
import { Vehicle } from '../../types';

/**
 * KAYAD Phase 1 (architecture hardening) - first coverage for this
 * hook, extracted verbatim from App.tsx. Verifies the moved logic
 * preserves the saved-vehicle contract. Phase 47 moves comparison out
 * of this hook into the app's single persisted CompareContext source.
 */


const favoriteMocks = vi.hoisted(() => ({ getFavorites: vi.fn(), toggleFavorite: vi.fn() }));
vi.mock('../../services/favoriteApi', () => ({
  getFavorites: favoriteMocks.getFavorites,
  toggleFavorite: favoriteMocks.toggleFavorite,
  FavoriteApiError: class FavoriteApiError extends Error { kind: string; constructor(message: string, kind: string) { super(message); this.kind = kind; } },
}));
function makeVehicle(id: string): Vehicle {
  return {
    id,
    title: `Vehicle ${id}`,
    make: 'Toyota',
    model: 'Corolla',
    year: 2020,
    vin: `VIN-${id}`,
    price: 1000000,
    mileage: 10000,
    location: 'Nairobi',
    bodyStyle: 'Sedan',
    transmission: 'Automatic',
    fuelType: 'Gasoline',
    engine: '1.8L',
    horsepower: 140,
    exteriorColor: 'White',
    interiorColor: 'Black',
    condition: 'Good',
    listingType: 'fixed',
    images: [],
    description: '',
    features: [],
    sellerId: 's1',
    sellerName: 'Seller',
    sellerRating: 4,
    isDealerCertified: false,
    savedCount: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
}

describe('useVehicleCollections', () => {
  it('starts with an empty saved collection and no seeded vehicle IDs', () => {
    const { result } = renderHook(() => useVehicleCollections([]));
    expect(result.current.savedVehicles).toEqual([]);
  });

  it('toggling save adds an unsaved ID and removes an already-saved one', () => {
    const { result } = renderHook(() => useVehicleCollections([]));

    act(() => result.current.handleToggleSave('v3'));
    expect(result.current.savedVehicles).toContain('v3');

    act(() => result.current.handleToggleSave('v3'));
    expect(result.current.savedVehicles).not.toContain('v3');
  });

  it('savedVehiclesList correctly derives from the passed-in vehicles array', () => {
    const vehicles = [makeVehicle('v1'), makeVehicle('v2'), makeVehicle('v9')];
    const { result } = renderHook(() => useVehicleCollections(vehicles));
    expect(result.current.savedVehiclesList).toEqual([]);

    act(() => result.current.handleToggleSave('v9'));
    expect(result.current.savedVehiclesList.map((v) => v.id)).toEqual(['v9']);
  });
});

/**
 * KAYAD Phase 2 (eliminate mock business state) - real favorites
 * integration. Every test mocks fetch() and asserts on the actual
 * request made or the actual resulting state, matching this program's
 * established standard (real request shapes, not just "doesn't crash").
 */
describe('useVehicleCollections - authenticated path (real favorites service)', () => {
  afterEach(() => vi.clearAllMocks());

  it('fetches real favorites on mount when a userId is provided', async () => {
    favoriteMocks.getFavorites.mockResolvedValue({ favorites: [{ id: 'real-1' }, { id: 'real-2' }] });
    const { result } = renderHook(() => useVehicleCollections([], 'user-123'));
    await waitFor(() => expect(result.current.savedVehicles).toEqual(['real-1', 'real-2']));
    expect(favoriteMocks.getFavorites).toHaveBeenCalledWith({ limit: 50 });
  });

  it('does not fetch when no userId is provided', () => {
    renderHook(() => useVehicleCollections([]));
    expect(favoriteMocks.getFavorites).not.toHaveBeenCalled();
  });

  it('toggles an authenticated favorite through the real service', async () => {
    favoriteMocks.getFavorites.mockResolvedValue({ favorites: [] });
    favoriteMocks.toggleFavorite.mockResolvedValue({ success: true, favorited: true });
    const { result } = renderHook(() => useVehicleCollections([], 'user-123'));
    await waitFor(() => expect(favoriteMocks.getFavorites).toHaveBeenCalled());
    act(() => result.current.handleToggleSave('car-42'));
    expect(result.current.savedVehicles).toContain('car-42');
    await waitFor(() => expect(favoriteMocks.toggleFavorite).toHaveBeenCalledWith('car-42'));
  });

  it('rolls back the optimistic update if the real toggle request fails', async () => {
    favoriteMocks.getFavorites.mockResolvedValue({ favorites: [] });
    favoriteMocks.toggleFavorite.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useVehicleCollections([], 'user-123'));
    await waitFor(() => expect(favoriteMocks.getFavorites).toHaveBeenCalled());
    act(() => result.current.handleToggleSave('car-99'));
    expect(result.current.savedVehicles).toContain('car-99');
    await waitFor(() => expect(result.current.savedVehicles).not.toContain('car-99'));
    expect(result.current.favoritesError).toBeTruthy();
  });

  it('does not invent a saved list when the real favorites service fails', async () => {
    favoriteMocks.getFavorites.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useVehicleCollections([], 'user-123'));
    await waitFor(() => expect(result.current.favoritesError).toBeTruthy());
    expect(result.current.savedVehicles).toEqual([]);
  });

  it('clears the authenticated collection at the logout boundary', async () => {
    favoriteMocks.getFavorites.mockResolvedValue({ favorites: [{ id: 'real-1' }] });
    const { result, rerender } = renderHook(({ userId }) => useVehicleCollections([], userId), { initialProps: { userId: 'user-123' } });
    await waitFor(() => expect(result.current.savedVehicles).toEqual(['real-1']));
    rerender({ userId: null });
    await waitFor(() => expect(result.current.savedVehicles).toEqual([]));
  });
});
