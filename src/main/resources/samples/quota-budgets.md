# Daily token and cost budgets

Measuring spend is not controlling it, so Corpus enforces durable per-user
daily ceilings: one million tokens and five US dollars per user per calendar
day in UTC, configurable globally and overridable per user in the
`user_quotas` table. A midnight-UTC rollover gives every user a fresh budget
on a rule anyone can reason about without reading the implementation.

## Check before, accrue after

The budget is checked before any model call starts and recorded after it
finishes, in a single upsert with no read-modify-write for replicas to
interleave. A user can therefore overshoot by at most one response; closing
that gap would mean holding a lock across an LLM call, trading a bounded,
documented overshoot for unbounded contention. Spending nothing consumes
nothing: cache hits and failed model calls never reach the accrual point.

## Refusals and kill switches

An exhausted budget refuses with HTTP 429 and the distinct code
`token_quota_exhausted`, so clients can tell "out for today" apart from rate
limiting's "slow down". Quotas report themselves through `GET /api/usage`
with spend, limits, and remainder, and the whole mechanism has a single
kill switch (`CORPUS_QUOTA_ENABLED=false`) for the day the limits prove
wrong.
