# Skill Similarity Reliability Audit (Reference)

## What This Skill Does

This skill audits whether similarity/deduplication conclusions can be trusted.

It focuses on:

- YAML validity
- metadata completeness
- embedding-driven similarity reliability
- confidence tiering
- scalable processing for thousands of skills

---

## Key Best Practices

### Embedding-First Similarity

Use embeddings as the primary similarity signal, but always add lexical heuristics.

### Confidence Tiers

Every similarity pair must be labeled:

- high
- medium
- low
- invalid-metadata

### Pair Classification

Every similarity pair must be classified:

- near_duplicate
- overlapping
- related
- unrelated

### Do Not Dedup on Vague Metadata Alone

Weak metadata should be flagged, but should not trigger dedup recommendations unless semantic overlap is clearly demonstrated.

---

## Parallelization Strategy

### Phase 1 (Shard-Safe)

Shard and parallelize:

- YAML parsing
- metadata scoring
- embedding generation

### Phase 2 (Global Retrieval)

Coordinator builds global ANN index and retrieves Top-K neighbors.

Default K=30, weak metadata K=50.

---

## Scalability Guarantee

This prevents:

- O(n²) blowups
- missed cross-shard duplicates
- false positives due to parsing errors
