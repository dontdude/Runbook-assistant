import { useCallback, useRef, useState } from 'react';
import { streamChat, usageCost, type Citation, type UsageStats } from '../api';

/** Single-question SSE chat state machine: idle -> streaming -> done | error. */
export function useChat(token: string | null, log: (line: string) => void) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runId = useRef(0);

  const ask = useCallback(async () => {
    if (!token || !question.trim() || streaming) return;
    const id = ++runId.current;
    setAnswer('');
    setCitations([]);
    setUsage(null);
    setError(null);
    setStreaming(true);
    log(`chat -> "${question.slice(0, 60)}"`);
    await streamChat(token, question.trim(), {
      onToken: (t) => {
        if (runId.current === id) setAnswer((a) => a + t);
      },
      onCitations: (c) => {
        if (runId.current === id) setCitations(c);
      },
      onUsage: (u) => {
        if (runId.current === id) {
          setUsage(u);
          log(`usage tokens=${u.totalTokens ?? '?'} cost=$${usageCost(u)}`);
        }
      },
      onDone: () => {
        if (runId.current === id) setStreaming(false);
      },
      onError: (m) => {
        if (runId.current === id) {
          setError(m);
          setStreaming(false);
          log(`chat error: ${m}`);
        }
      }
    });
  }, [token, question, streaming, log]);

  return { question, setQuestion, answer, citations, usage, streaming, error, ask };
}
