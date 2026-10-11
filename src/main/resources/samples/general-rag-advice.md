# General RAG chunking and ranking advice

These are rule-of-thumb starting points for a first retrieval system, meant
to be replaced by measurement on your own data once it exists.

## Chunking

Start with sliding windows around 256 tokens and roughly ten percent overlap.
Small windows raise precision because more of each retrieved chunk is about
the query; large windows preserve narrative at the cost of diluting the
signal. Any fixed tokenizer works for counting; exact token counts matter
less than keeping windows stable across re-ingests so chunk identities do
not churn.

## Ranking

A common staged design retrieves a broad candidate set with cheap lexical
plus vector search, then reranks the top 100 with a cross-encoder. Dot
product and cosine rank identically on normalized embeddings; pick cosine
when normalization cannot be guaranteed. Fuse the two legs with a simple
weighted sum tuned on a handful of sample queries, and promote whatever the
reranker scores highest regardless of its first-stage position.
