# The vector store schema

All database structure is owned by Flyway migrations; the vector store is
never allowed to create schema for itself, so the applied DDL is
deterministic and versioned. The core table is `vector_store` with four
columns: a UUID primary key, the chunk `content` as text, a `metadata` JSONB
column carrying the owning user id and document id, and the `embedding`
vector whose dimension is a migration placeholder filled from configuration.

## Indexes, one per access pattern

Each query pattern gets its own index. Cosine similarity over embeddings
uses an HNSW index with `m = 16` and `ef_construction = 64` on
`vector_cosine_ops`. User and document scoping on the vector leg uses a GIN
index over the metadata JSONB, with additional btree indexes on the extracted
user and document ids for the SQL-side scoping of the keyword leg. Keyword
search itself runs over `content_tsv`, a `tsvector` column generated always
from the English text search configuration and stored alongside the content,
backed by its own GIN index so both retrieval legs fuse on the same table.

## The dimension guard

The embedding dimension is baked into the table definition. Switching
embedding models changes the dimension, and starting the application against
a corpus built with a different dimension fails fast with an explicit error
instead of serving mixed-dimension vectors: the operator wipes the database
volume and re-ingests. A startup check enforces this rather than trusting
documentation.

## Retrieval caps

The reranker considers at most 40 candidates per query: the cross-encoder's
attention cost grows quadratically with sequence length, so the cap bounds
the most expensive stage of retrieval while leaving recall to the cheap
first stage.
