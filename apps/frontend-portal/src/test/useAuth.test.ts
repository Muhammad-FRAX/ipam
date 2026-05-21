import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../hooks/useAuth';

// Mock axios to avoid real network calls
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    defaults: { headers: { common: {} } },
  },
}));

import axios from 'axios';

const VALID_JWT = (() => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: 'user-uuid-123',
    email: 'test@ipam.local',
    roles: ['ADMIN'],
    exp: Math.floor(Date.now() / 1000) + 3600,
  }));
  return `${header}.${payload}.fake-sig`;
})();

const EXPIRED_JWT = (() => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: 'user-uuid-999',
    email: 'old@ipam.local',
    roles: [],
    exp: Math.floor(Date.now() / 1000) - 3600,
  }));
  return `${header}.${payload}.fake-sig`;
})();

describe('useAuth hook', () => {
  beforeEach(() => {
    localStorage.clear();
    (axios.defaults.headers as any).common = {};
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('returns null user when no token in localStorage', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toBeNull();
  });

  it('decodes a valid stored token on mount', () => {
    localStorage.setItem('ipam_access_token', VALID_JWT);
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).not.toBeNull();
    expect(result.current.user?.email).toBe('test@ipam.local');
    expect(result.current.user?.userId).toBe('user-uuid-123');
    expect(result.current.user?.roles).toContain('ADMIN');
  });

  it('returns null and cleans up an expired token', () => {
    localStorage.setItem('ipam_access_token', EXPIRED_JWT);
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('ipam_access_token')).toBeNull();
  });

  it('login stores token and sets user', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({ data: { accessToken: VALID_JWT } });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.login('test@ipam.local', 'password123');
    });

    expect(result.current.user?.email).toBe('test@ipam.local');
    expect(localStorage.getItem('ipam_access_token')).toBe(VALID_JWT);
  });

  it('logout clears user and removes token', async () => {
    localStorage.setItem('ipam_access_token', VALID_JWT);
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).not.toBeNull();

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('ipam_access_token')).toBeNull();
  });
});
