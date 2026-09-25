import { useCallback, useState } from 'react';
import { api, type ScoredChunk } from '../api';

/** Hybrid-search box with per-request rerank A/B toggle. */
export function useSearch(token: string | null) {
  const [query, setQuery] = useState('');
  const [rerank, setRerank] = useState(true);
  const [results, setResults] = useState<ScoredChunk[]>([]);
  const [reranker, setReranker] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    if (!token || !query.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.search(token, query.trim(), rerank);
      setResults(res.results);
      setReranker(res.reranker);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'search failed');
    } finally {
      setLoading(false);
    }
  }, [token, query, rerank, loading]);

  return { query, setQuery, rerank, setRerank, results, reranker, loading, error, run };
}
