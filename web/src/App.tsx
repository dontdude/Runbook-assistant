import React, { useState } from 'react';
import { chatSse, listDocs, login, search, uploadDoc, type Citation, type ScoredChunk, type UsageStats } from './api';

export default function App() {
  const [token, setToken] = useState('');
  const [user, setUser] = useState('demo');
  const [pass, setPass] = useState('demo');
  const [tab, setTab] = useState<'chat' | 'docs' | 'search'>('chat');

  // chat state
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState('');
  const [cites, setCites] = useState<Citation[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [trace, setTrace] = useState<string[]>([]);

  // docs state
  const [docs, setDocs] = useState<{ id: string; filename: string; status: string; chunkCount: number }[]>([]);
  // search state
  const [sq, setSq] = useState('');
  const [rerank, setRerank] = useState(true);
  const [results, setResults] = useState<ScoredChunk[]>([]);
  const [reranker, setReranker] = useState('');

  const doLogin = async () => {
    const t = await login(user, pass);
    setToken(t);
    setTrace((tr) => [...tr, `auth ok (${t.length} chars)`]);
  };

  const refreshDocs = async () => {
    const d = await listDocs(token);
    setDocs(d as never[]);
  };

  const doUpload = async (f: File | undefined) => {
    if (!f) return;
    const created = await uploadDoc(token, f);
    setTrace((tr) => [...tr, `upload 202 ${created.filename} -> ${created.status}`]);
    // async ingestion: poll until READY (simple interval, stops after ~30s)
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const d = await listDocs(token);
      setDocs(d as never[]);
      const cur = d.find((x) => x.id === (created as { id: string }).id);
      if (cur && cur.status !== 'PENDING' && cur.status !== 'PROCESSING') break;
    }
  };

  const doChat = async () => {
    setAnswer('');
    setCites([]);
    setUsage(null);
    setStreaming(true);
    setTrace((tr) => [...tr, `chat -> "${q.slice(0, 60)}"`]);
    await chatSse(token, q, {
      onToken: (t) => setAnswer((a) => a + t),
      onCitations: (c) => setCites(c),
      onUsage: (u) => {
        setUsage(u);
        setTrace((tr) => [...tr, `usage tokens=${u.totalTokens ?? '?'} cost=$${u.costUsd ?? '?'}`]);
      },
      onDone: () => setStreaming(false),
      onError: (m) => {
        setStreaming(false);
        setTrace((tr) => [...tr, `error: ${m}`]);
      }
    });
  };

  const doSearch = async () => {
    const r = await search(token, sq, rerank);
    setResults(r.results);
    setReranker(r.reranker);
  };

  // render [n] citation markers as superscript chips
  const renderAnswer = (text: string) =>
    text.split(/(\[\d+\])/g).map((part, i) =>
      /^\[\d+\]$/.test(part) ? (
        <sup key={i} style={{ background: '#eef', padding: '0 4px', borderRadius: 4 }}>{part}</sup>
      ) : (
        <span key={i}>{part}</span>
      )
    );

  if (!token)
    return (
      <div style={{ maxWidth: 420, margin: '10vh auto', fontFamily: 'system-ui' }}>
        <h2>Runbook-assistant</h2>
        <p>Login with the seeded demo user (demo/demo) or your own JWT identity.</p>
        <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="username" style={{ width: '100%', marginBottom: 8 }} />
        <input value={pass} onChange={(e) => setPass(e.target.value)} type="password" placeholder="password" style={{ width: '100%', marginBottom: 8 }} />
        <button onClick={doLogin} style={{ width: '100%' }}>Login</button>
      </div>
    );

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16, fontFamily: 'system-ui' }}>
      <h2>Runbook-assistant</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['chat', 'docs', 'search'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} disabled={tab === t}>{t}</button>
        ))}
      </div>

      {tab === 'chat' && (
        <div>
          <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={3} style={{ width: '100%' }} placeholder="Ask about your docs — answer streams with citations" />
          <button onClick={doChat} disabled={streaming || !q}>Ask</button>
          <div style={{ whiteSpace: 'pre-wrap', border: '1px solid #ddd', padding: 12, marginTop: 12, minHeight: 120 }}>
            {renderAnswer(answer) || (streaming ? 'streaming…' : 'answer appears here')}
          </div>
          {cites.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <b>Citations</b>
              <ul>{cites.map((c) => <li key={c.index}>[{c.index}] {c.filename} (chunk {c.chunkIndex})</li>)}</ul>
            </div>
          )}
          {usage && <div style={{ fontSize: 12, color: '#555' }}>tokens={String(usage.totalTokens ?? '?')} cost=${String(usage.costUsd ?? '?')}</div>}
        </div>
      )}

      {tab === 'docs' && (
        <div>
          <input type="file" accept=".pdf,.md,.txt,.docx" onChange={(e) => doUpload(e.target.files?.[0])} />
          <button onClick={refreshDocs} style={{ marginLeft: 8 }}>Refresh</button>
          <ul>{docs.map((d) => <li key={d.id}>{d.filename} — {d.status} ({d.chunkCount} chunks)</li>)}</ul>
        </div>
      )}

      {tab === 'search' && (
        <div>
          <input value={sq} onChange={(e) => setSq(e.target.value)} style={{ width: '70%' }} placeholder="hybrid search query" />
          <label style={{ marginLeft: 8 }}><input type="checkbox" checked={rerank} onChange={(e) => setRerank(e.target.checked)} /> rerank</label>
          <button onClick={doSearch} style={{ marginLeft: 8 }}>Search</button>
          {reranker && <div style={{ fontSize: 12 }}>reranker: {reranker}</div>}
          <ol>{results.map((r) => <li key={r.chunkId}><b>{r.filename}</b> rrf={r.rrfScore.toFixed(3)} rerank={r.rerankScore ?? '—'}<br /><span style={{ fontSize: 13 }}>{r.content.slice(0, 240)}…</span></li>)}</ol>
        </div>
      )}

      <details style={{ marginTop: 16 }}>
        <summary>Trace (tokens, cost, uploads)</summary>
        <pre style={{ fontSize: 12 }}>{trace.join('\n') || '—'}</pre>
      </details>
    </div>
  );
}
