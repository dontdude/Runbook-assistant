# General PostgreSQL tuning notes

Sane starting points for a transactional PostgreSQL instance, to be confirmed
against your own workload with EXPLAIN ANALYZE rather than applied blindly.

## Memory

Set `shared_buffers` to about twenty-five percent of system RAM so the
database caches hot pages itself instead of relying entirely on the OS page
cache. Give individual sorts and hashes room with `work_mem`, but size it
conservatively: it is allocated per operation per connection, so an
aggressive value times many connections is an out-of-memory incident waiting
to happen.

## Indexes and maintenance

B-tree remains the default index for equality and range predicates. Reach for
GIN when the workload is full-text search over documents or containment over
arrays and JSONB. Run autovacuum and ANALYZE on a schedule appropriate to
write volume so the planner's statistics — and therefore its index choices —
track reality. An index built and never maintained quietly becomes a
liability: measure hit rates and drop what the workload does not use.
