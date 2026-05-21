import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export interface AuthUser {
  userId: string;
  email: string;
  roles: string[];
}

const TOKEN_KEY = 'ipam_access_token';

function decodeToken(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.sub || !payload.email) return null;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    return { userId: payload.sub, email: payload.email, roles: payload.roles || [] };
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    return decodeToken(token);
  });

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      const decoded = decodeToken(token);
      if (decoded) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(decoded);
      } else {
        localStorage.removeItem(TOKEN_KEY);
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
      }
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const res = await axios.post('/api/auth/login', { email, password });
    const { accessToken } = res.data;
    if (!accessToken) throw new Error('No access token returned');
    const decoded = decodeToken(accessToken);
    if (!decoded) throw new Error('Invalid token received');
    localStorage.setItem(TOKEN_KEY, accessToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    setUser(decoded);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  }, []);

  return { user, login, logout };
}
