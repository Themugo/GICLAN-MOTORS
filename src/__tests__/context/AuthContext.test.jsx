import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';

const authMocks = vi.hoisted(() => ({
  getMe: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
  updateProfile: vi.fn(),
}));

vi.mock('../../services/authApi', () => authMocks);

vi.mock('../../utils/posthog', () => ({
  setPostHogUser: vi.fn(),
  clearPostHogUser: vi.fn(),
}));

function wrapper({ children }) {
  return (
    <MemoryRouter>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.getMe.mockResolvedValue(null);
    localStorage.clear();
  });

  it('provides initial state with no user when no session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => Promise.resolve());
    await act(() => Promise.resolve());
    expect(result.current.isAuth).toBe(false);
  });

  it('resolves loading to false after initialization', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => Promise.resolve());
    await act(() => Promise.resolve());
    expect(result.current.loading).toBe(false);
  });
});

describe('useAuth', () => {
  it('returns context within provider', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current).toBeDefined();
    expect(result.current.isAuth).toBeDefined();
  });
});
