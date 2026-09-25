import { useCallback, useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useChat } from './hooks/useChat';
import { useDocs } from './hooks/useDocs';
import { useSearch } from './hooks/useSearch';
import { LoginCard } from './components/LoginCard';
import { ChatTab } from './components/ChatTab';
import { DocsTab } from './components/DocsTab';
import { SearchTab } from './components/SearchTab';

type Tab = 'chat' | 'docs' | 'search';

const TABS: { id: Tab; label: string }[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'docs', label: 'Documents' },
  { id: 'search', label: 'Search' }
];

export default function App() {
  const auth = useAuth();
  const [tab, setTab] = useState<Tab>('chat');
  const [trace, setTrace] = useState<string[]>([]);

  const log = useCallback((line: string) => {
    setTrace((lines) => [...lines.slice(-99), `${new Date().toLocaleTimeString()} ${line}`]);
  }, []);

  const chat = useChat(auth.token, log);
  const docs = useDocs(auth.token, log);
  const search = useSearch(auth.token);

  if (!auth.token) {
    return (
      <div className="page">
        <LoginCard busy={auth.busy} error={auth.error} onLogin={auth.login} />
      </div>
    );
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Runbook-assistant</h1>
          <span className="sub">grounded answers over your docs</span>
        </div>
        <button className="ghost" onClick={auth.logout}>
          Sign out
        </button>
      </header>

      <nav className="tabs" role="tablist" aria-label="Sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'chat' && <ChatTab chat={chat} />}
      {tab === 'docs' && <DocsTab docs={docs} />}
      {tab === 'search' && <SearchTab search={search} />}

      <details className="card">
        <summary className="muted">Trace — tokens, cost, uploads</summary>
        <pre className="trace">{trace.join('\n') || '—'}</pre>
      </details>
    </div>
  );
}
