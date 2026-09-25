import { useCallback, useState } from 'react';
import { api, type DocItem } from '../api';

const TERMINAL = new Set(['READY', 'FAILED']);
const POLL_MS = 2000;
const POLL_ROUNDS = 15;

/** Document list + upload with async-ingestion polling + delete. */
export function useDocs(token: string | null, log: (line: string) => void) {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const page = await api.listDocs(token);
      setDocs(page.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load failed');
    } finally {
      setLoading(false);
    }
  }, [token]);

  /** Upload returns 202; poll until the ingestion worker reaches a terminal state. */
  const upload = useCallback(
    async (file: File) => {
      if (!token) return;
      setError(null);
      const created = await api.uploadDoc(token, file);
      log(`upload 202 ${created.filename} -> ${created.status}`);
      for (let i = 0; i < POLL_ROUNDS; i++) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        const page = await api.listDocs(token);
        setDocs(page.items);
        const current = page.items.find((d) => d.id === created.id);
        if (current && TERMINAL.has(current.status)) {
          log(`ingest ${current.status} chunks=${current.chunkCount}`);
          return;
        }
      }
      log('ingest poll timed out — hit Refresh');
    },
    [token, log]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!token) return;
      await api.deleteDoc(token, id);
      setDocs((ds) => ds.filter((d) => d.id !== id));
      log(`delete ${id.slice(0, 8)}`);
    },
    [token, log]
  );

  return { docs, loading, error, refresh, upload, remove };
}
