// Typed client for the Runbook-assistant REST API. No Java changes required:
// mirrors ChatController, DocumentController, SearchController, AuthController.

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
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' | string;
  chunkCount: number;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  total: number;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, token: string | null, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(path, { ...init, headers: { ...headers, ...(init?.headers as Record<string, string>) } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(res.status, `${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 160)}` : ''}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

export const api = {
  login(username: string, password: string) {
    return request<{ token: string }>('/api/auth/token', null, json({ username, password })).then((r) => r.token);
  },

  listDocs(token: string) {
    return request<Page<DocItem>>('/api/documents?size=50', token);
  },

  async uploadDoc(token: string, file: File): Promise<DocItem> {
    const form = new FormData();
    form.append('file', file);
    return request<DocItem>('/api/documents', token, { method: 'POST', body: form });
  },

  deleteDoc(token: string, id: string) {
    return request<void>(`/api/documents/${id}`, token, { method: 'DELETE' });
  },

  search(token: string, query: string, rerank: boolean) {
    return request<{ query: string; count: number; reranker: string; results: ScoredChunk[] }>(
      '/api/search',
      token,
      json({ query, topK: 6, rerank })
    );
  }
};

export interface ChatHandlers {
  onToken: (text: string) => void;
  onCitations: (c: Citation[]) => void;
  onUsage: (u: UsageStats) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

/**
 * POST /api/chat with Accept: text/event-stream.
 * Event order: token* -> citations -> usage -> done (or error).
 * Parses the SSE byte stream manually so partial frames never break a render.
 */
export async function streamChat(token: string, message: string, h: ChatHandlers): Promise<void> {
  let res: Response;
  try {
    res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream'
      },
      body: JSON.stringify({ message, topK: 6 })
    });
  } catch (e) {
    h.onError(e instanceof Error ? e.message : 'network error');
    return;
  }
  if (!res.ok || !res.body) {
    h.onError(`${res.status} ${res.statusText}`);
    return;
  }
  const emit = (event: string, raw: string) => {
    if (!raw) return;
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return; // ignore partial frames
    }
    if (event === 'token' && typeof data['text'] === 'string') h.onToken(data['text'] as string);
    else if (event === 'citations') {
      const list = Array.isArray(data) ? data : (data['citations'] as Citation[] | undefined) ?? [];
      h.onCitations(list as Citation[]);
    } else if (event === 'usage') h.onUsage(data as unknown as UsageStats);
    else if (event === 'done') h.onDone();
    else if (event === 'error') h.onError(String(data['message'] ?? data['error'] ?? 'stream error'));
  };

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let event = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) {
        emit(event, line.slice(5).trim());
        event = '';
      } else if (line === '') event = '';
    }
  }
  h.onDone();
}
