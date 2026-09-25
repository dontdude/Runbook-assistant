import { Hint } from './Hint';
import type { useSearch } from '../hooks/useSearch';

type Search = ReturnType<typeof useSearch>;

/** Retrieval-only view: same query twice with the toggle = live rerank A/B. */
export function SearchTab({ search }: { search: Search }) {
  return (
    <section>
      <Hint>
        Raw retrieval, no chat model. Run a query, then flip the rerank toggle and run it again —
        that is the hybrid-RRF vs cross-encoder A/B the eval gates enforce.
      </Hint>
      <div className="card">
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            search.run();
          }}
        >
          <input
            type="text"
            value={search.query}
            onChange={(e) => search.setQuery(e.target.value)}
            placeholder="hybrid search query"
            aria-label="Search query"
            style={{ flex: 1, minWidth: 200 }}
          />
          <label className="check">
            <input type="checkbox" checked={search.rerank} onChange={(e) => search.setRerank(e.target.checked)} />
            rerank
          </label>
          <button className="primary" type="submit" disabled={search.loading || !search.query.trim()}>
            {search.loading ? 'Searching…' : 'Search'}
          </button>
        </form>
        {search.reranker && <div className="muted" style={{ marginTop: 8 }}>reranker: {search.reranker}</div>}
      </div>

      {search.error && (
        <div className="card error" role="alert">
          {search.error}
        </div>
      )}

      {search.results.length > 0 && (
        <div className="card">
          <ol className="result-list">
            {search.results.map((r) => (
              <li key={r.chunkId}>
                <strong>{r.filename}</strong>{' '}
                <span className="score">
                  rrf={r.rrfScore.toFixed(3)}
                  {r.rerankScore != null && ` rerank=${r.rerankScore.toFixed(2)}`}
                  {r.vectorScore != null && ` vec=${r.vectorScore.toFixed(3)}`}
                  {r.ftsScore != null && ` fts=${r.ftsScore.toFixed(3)}`}
                </span>
                <div className="snippet">{r.content.slice(0, 240)}…</div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
