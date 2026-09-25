// Minimal API client matching the Spring Boot contract (no Java changes).
// Auth: POST /api/auth/token {username,password} -> {token}; send as `Authorization: Bearer <token>`.

export interface Citation {
  index: number;
  chunkId: string;
  documentId: string;
  filename: string;
  chunkIndex: number;
}

export interface UsageStats {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  costUsd?: number;
  [k: string]: unknown;
}

export interface ScoredChunk {
  chunkId: string;
  documentId: string;
  filename: string;
  chunkIndex: number;
  content: string;
  rank: number;
  rrfScore: number;
  vectorScore?: number | null;
  ftsScore?: number | null;
  rerankScore?: number | null;
}

export interface DocItem {
  id: string;
  filename: string;
  status: string;
  chunkCount: number;
  createdAt: string;
}

function headers(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function login(username: string, password: string): Promise<string> {
  const r = await fetch('/api/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!r.ok) throw new Error(`login ${r.status}`);
  const j = await r.json();
  return j.token as string;
}

export async function listDocs(token: string): Promise<DocItem[]> {
  const r = await fetch('/api/documents?size=50', { headers: headers(token) });
  if (!r.ok) throw new Error(`docs ${r.status}`);
  const j = await r.json();
  return (j.content ?? j) as DocItem[];
}

export async function uploadDoc(token: string, file: File): Promise<DocItem> {
  const fd = new FormData();
  fd.append('file', file);
  const r = await fetch('/api/documents', {
    method: 'POST',
    headers: headers(token),
    body: fd
  });
  if (!r.ok) throw new Error(`upload ${r.status}: ${await r.text()}`);
  return (await r.json()) as DocItem;
}

export async function search(
  token: string,
  query: string,
  rerank: boolean
): Promise<{ reranker: string; results: ScoredChunk[] }> {
  const r = await fetch('/api/search', {
    method: 'POST',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, topK: 6, rerank })
  });
  if (!r.ok) throw new Error(`search ${r.status}`);
  return (await r.json()) as { reranker: string; results: ScoredChunk[] };
}

export interface ChatEvents {
  onToken: (t: string) => void;
  onCitations: (c: Citation[]) => void;
  onUsage: (u: UsageStats) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}

// POST /api/chat with Accept: text/event-stream. Events: token* -> citations -> usage -> done (or error).
export async function chatSse(token: string, message: string, ev: ChatEvents): Promise<void> {
  const r = await fetch('/api/chat', {
    method: 'POST',
    headers: { ...headers(token), 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ message, topK: 6 })
  });
  if (!r.ok || !r.body) {
    ev.onError(`chat ${r.status}: ${await r.text()}`);
    return;
  }
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let eventName = '';
  const dispatch = (name: string, data: string) => {
    try {
      const j = data ? JSON.parse(data) : {};
      if (name === 'token') ev.onToken((j.text ?? '') as string);
      else if (name === 'citations') ev.onCitations((Array.isArray(j) ? j : j.citations ?? []) as Citation[]);
      else if (name === 'usage') ev.onUsage(j as UsageStats);
      else if (name === 'done') ev.onDone();
      else if (name === 'error') ev.onError((j.message ?? j.error ?? 'stream error') as string);
    } catch {
      /* ignore partial frames */
    }
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (line.startsWith('event:')) eventName = line.slice(6).trim();
      else if (line.startsWith('data:')) {
        dispatch(eventName, line.slice(5).trim());
        eventName = '';
      } else if (line === '') eventName = '';
    }
  }
  ev.onDone();
}
