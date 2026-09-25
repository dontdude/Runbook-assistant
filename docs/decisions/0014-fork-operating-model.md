# ADR 0014 — Operating this fork: keyless daily driver, separate web UI, history preserved

**Status:** accepted

## Context

This fork is developed on a laptop with finite RAM and no cloud model key.
Upstream's `local` profile assumes Ollama for both chat (`qwen3:4b`) and
embeddings (`nomic-embed-text`): correct as a zero-config default, but the
Ollama container holds several gigabytes resident, and the chat model is the
weakest link in the stack — everything worth measuring (hybrid retrieval,
reranking, evals, cost tracking) works without it.

Two more facts constrain the setup. First, the embedding dimension is baked
into the schema (ADR: dimension matrix), so `local` (768) and
`keyless`/`cloud-ONNX` (384) cannot share a database — switching profiles
means wiping and re-seeding. Second, upstream had no web UI, and the review
surface for this project is a human clicking through upload → search → chat,
not curl.

## Decision

### Keyless as the daily driver, via gitignored `.env`, not a compose edit

`SPRING_PROFILES_ACTIVE=keyless` lives in a local `.env` file (gitignored),
which compose picks up through its existing `${VAR:-local}` default. The
tracked `docker-compose.yml` is untouched, so upstream's default and CI
behavior are unchanged. After any `docker compose up -d app`, Ollama is
stopped explicitly — compose restarts it through the `app → ollama-init →
ollama` dependency chain even though nothing in the keyless path calls it.

The trade: `/api/chat` returns the documented 503. That is accepted because
the parts under active development — ingestion, hybrid search + rerank,
MCP search/list, metrics, and the UI — are all fully exercisable keyless,
and chat correctness is covered by the nightly judge evals, not by local
clicking.

### Web UI as a separate Vite app in `web/`, not Spring static resources

Serving the UI from `src/main/resources/static` would couple the frontend
build to the Gradle build and slow both down. `web/` is an independent Vite
+ React 18 + TS app (zero runtime deps) with a dev proxy to `:8080`, so the
UI iterates in under a second while the backend stays up. API shape is
derived from the controllers, never the reverse — no Java changes were made
for the UI.

### History preserved, rebrand cosmetic-only

The upstream history is kept with an `upstream-import` tag; all fork work is
normal commits on top. Renames are limited to display surfaces (README,
compose names, image labels, Helm metadata). The Java package, `CORPUS_*`
env prefix, metrics, migrations, and golden set are untouched — which is why
`./gradlew build` passes unmodified and the eval report reproduces the
upstream numbers exactly (recall@1 0.688 → 0.813, MRR 0.792 → 0.883).

## Consequences

- A fresh profile switch requires `docker volume rm <project>_pgdata` and a
  re-seed; the startup dimension guard enforces this loudly rather than
  serving mixed-dimension vectors silently.
- First keyless boot downloads ~120MB of ONNX models and takes minutes; later
  boots reuse the `onnx-cache` volume. The `ollama-models` volume is kept
  even though Ollama stays stopped, so a chat demo is one `up` away.
- The UI stores the JWT in `localStorage` (24h TTL, no refresh flow) —
  acceptable for a local demo client, not a pattern to copy into a shared
  frontend.
- `.env` is gitignored and must never carry real secrets into a commit; a
  cloud key goes there only as a local override, following the same rule as
  the profile setting.
