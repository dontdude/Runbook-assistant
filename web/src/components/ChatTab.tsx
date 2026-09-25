import { CitedText } from './CitedText';
import { Hint } from './Hint';
import type { useChat } from '../hooks/useChat';

type Chat = ReturnType<typeof useChat>;

/** Streaming Q&A: question box, live answer, citations, token/cost usage. */
export function ChatTab({ chat }: { chat: Chat }) {
  return (
    <section>
      <Hint>
        Ask in plain words — the answer streams token by token, and every [n] links to the exact source
        chunk below. Usage shows what the answer cost.
      </Hint>
      <div className="card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            chat.ask();
          }}
        >
          <label>
            <span className="muted">Question</span>
            <textarea
              rows={3}
              value={chat.question}
              onChange={(e) => chat.setQuestion(e.target.value)}
              placeholder="Ask about your docs — answer streams with citations"
            />
          </label>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="primary" type="submit" disabled={chat.streaming || !chat.question.trim()}>
              {chat.streaming ? 'Streaming…' : 'Ask'}
            </button>
          </div>
        </form>
      </div>

      <div className="card answer" aria-live="polite">
        {chat.answer ? <CitedText text={chat.answer} /> : <span className="muted">answer appears here</span>}
      </div>

      {chat.error && (
        <div className="card error" role="alert">
          {chat.error}
        </div>
      )}

      {chat.citations.length > 0 && (
        <div className="card">
          <strong>Citations</strong>
          <ul className="cite-list">
            {chat.citations.map((c) => (
              <li key={c.index}>
                [{c.index}] {c.filename} <span className="muted">· chunk {c.chunkIndex}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {chat.usage && (
        <div className="muted">
          tokens={String(chat.usage.totalTokens ?? '?')} cost=${String(chat.usage.costUsd ?? '?')}
        </div>
      )}
    </section>
  );
}
