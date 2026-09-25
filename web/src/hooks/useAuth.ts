import { useCallback, useState } from 'react';
import { api } from '../api';

const STORAGE_KEY = 'runbook-assistant.token';

/** JWT session with localStorage persistence across reloads. */
export function useAuth() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (username: string, password: string) => {
    setBusy(true);
    setError(null);
    try {
      const t = await api.login(username, password);
      localStorage.setItem(STORAGE_KEY, t);
      setToken(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'login failed');
    } finally {
      setBusy(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
  }, []);

  return { token, busy, error, login, logout };
}
