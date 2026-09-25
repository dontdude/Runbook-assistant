import { useEffect, useState } from 'react';
import type { useDocs } from '../hooks/useDocs';

type Docs = ReturnType<typeof useDocs>;

/** Upload (202 + ingestion polling in the hook) plus deletable doc list. */
export function DocsTab({ docs }: { docs: Docs }) {
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    docs.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    try {
      await docs.upload(file);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'upload failed');
    }
  };

  return (
    <section>
      <div className="card row">
        <label className="row">
          <input
            type="file"
            accept=".pdf,.md,.txt,.docx"
            aria-label="Upload document"
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
        <button className="ghost" onClick={docs.refresh} disabled={docs.loading}>
          {docs.loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {uploadError && (
        <div className="card error" role="alert">
          {uploadError}
        </div>
      )}
      {docs.error && (
        <div className="card error" role="alert">
          {docs.error}
        </div>
      )}

      <div className="card">
        <strong>Documents</strong>
        {docs.docs.length === 0 ? (
          <p className="muted">No documents yet — upload a PDF, Markdown, DOCX or TXT file.</p>
        ) : (
          <ul className="doc-list">
            {docs.docs.map((d) => (
              <li key={d.id} className="row" style={{ justifyContent: 'space-between' }}>
                <span>
                  {d.filename} <span className="badge">{d.status}</span>{' '}
                  <span className="muted">· {d.chunkCount} chunks</span>
                </span>
                <button className="ghost" onClick={() => docs.remove(d.id)} aria-label={`Delete ${d.filename}`}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
