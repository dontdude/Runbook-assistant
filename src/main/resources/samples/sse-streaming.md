# Streaming chat answers over SSE

Chat answers stream back as Server-Sent Events so the first words render
before the model finishes. The event contract is fixed: any number of
`token` events carrying `{"text": ...}` deltas, then exactly one `citations`
event, one `usage` event, and a final `done` event carrying the conversation
id. A failure anywhere in the pipeline produces a single `error` event with a
message instead. Clients must handle the events in this order and must not
assume any fixed count of token events.

## Timeouts and keep-alive

Streams live under an SSE timeout of 120 seconds, and a heartbeat comment
goes out every 15 seconds. Load balancers commonly idle out at 60 seconds,
so the heartbeat exists to keep long generations alive through them without
disturbing the event contract. Responses carry `X-Accel-Buffering: no` so
nginx-style proxies do not buffer the stream, plus `Cache-Control:
no-cache, no-store, no-transform` so intermediaries neither store nor
rewrite it.

## Disconnects cancel the model call

If the client goes away mid-stream, the send fails, the stream is closed,
and the upstream provider subscription is cancelled with it. A disconnected
request therefore stops generating — and billing — instead of running to
completion in the background where nobody will ever read the answer.
