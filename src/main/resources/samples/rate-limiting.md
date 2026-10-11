# Rate limiting in Corpus

Every request passes a per-user token bucket before it reaches a controller.
The default budget is 30 requests per minute per user, enforced with Bucket4j.
Exceeding it returns HTTP 429 with a `Retry-After` header telling the client
how long to wait, plus an `X-RateLimit-Remaining` header on successful calls
so clients can pace themselves before they hit the wall.

## A separate, stricter budget for login

`POST /api/auth/token` has its own bucket: 10 attempts per minute per IP
address. Login is the one endpoint an attacker can hammer without
credentials, so it gets the tightest limit in the system, keyed by client IP
rather than by user.

## Two bucket backends

Buckets live in memory by default, which is correct for a single instance.
Deployments with more than one replica switch the backend to Postgres
(`CORPUS_RATE_LIMIT_BACKEND=postgres`) so every replica draws from the same
budget; otherwise each replica would grant its own full allowance. Behind a
proxy the client IP comes from a trusted forwarded header, so a client cannot
forge its way into somebody else's bucket.

## Rate limits are not quotas

Hitting 429 means "slow down", not "out for today". Spending ceilings are a
separate mechanism with a distinct refusal code, because the two failures
have completely different remedies.
