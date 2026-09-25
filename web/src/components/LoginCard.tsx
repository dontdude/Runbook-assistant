import { useState } from 'react';

/** Login form; lifts the JWT up via onLogin (hook-owned in App). */
export function LoginCard({
  busy,
  error,
  onLogin
}: {
  busy: boolean;
  error: string | null;
  onLogin: (username: string, password: string) => void;
}) {
  const [username, setUsername] = useState('demo');
  const [password, setPassword] = useState('demo');

  return (
    <div className="login-wrap">
      <h1>Runbook-assistant</h1>
      <p className="muted">Ask your docs. Grounded answers with citations.</p>
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          onLogin(username, password);
        }}
      >
        <label>
          <span className="muted">Username</span>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </label>
        <label>
          <span className="muted">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && <div className="error" role="alert">{error}</div>}
        <button className="primary" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
