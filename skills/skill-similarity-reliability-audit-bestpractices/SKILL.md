---
name: Skill Similarity Reliability Audit
description: >
  Audits the reliability of skill similarity and deduplication findings by validating YAML frontmatter,
  scoring metadata quality, and explicitly quantifying confidence tiers for duplicate detection.
version: 2.0.0
author: ForgeMind
tags:
  - audit
  - similarity
  - deduplication
  - metadata
  - yaml
  - embeddings
outputs:
  - _skill_similarity_results.json
  - _skill_similarity_audit_report.md
  - _skill_similarity_invalid_frontmatter.json
---

# Skill Similarity Reliability Audit

## Purpose

This skill audits whether similarity / deduplication conclusions can be trusted, **based on the quality and validity of SKILL.md YAML frontmatter**.

It is designed for repos containing **hundreds or thousands of skills**, where similarity analysis is typically performed by GenAI agents using embeddings.

The main objective is to prevent "false duplicates" and "missed duplicates" caused by:

- invalid YAML frontmatter
- missing or vague descriptions
- inconsistent naming
- missing domain keywords / tags
- incomplete metadata
- parsing errors that break embedding inputs

---

## Core Principle

**If YAML frontmatter is invalid, similarity scoring is untrustworthy.**

Invalid YAML means the skill must be treated as:

- excluded from similarity analysis, OR
- reprocessed after metadata repair

---

## Inputs

- A folder containing many skills, each with a `SKILL.md`
- Optional: `_skill_similarity_results.json` produced by another agent

---

## Outputs

### 1) `_skill_similarity_invalid_frontmatter.json`

List of skills whose YAML frontmatter fails to parse.

### 2) `_skill_similarity_results.json`

Similarity results **annotated with confidence tiers**.

### 3) `_skill_similarity_audit_report.md`

Human-readable summary of reliability issues.

---

# Similarity Computation (How It Should Be Done)

This skill assumes similarity is computed by GenAI agents using **embeddings**.

## Recommended Similarity Method (Best Practice)

### Primary: Embedding Similarity

- Generate embeddings from:
  - `name`
  - `description`
  - `tags`
  - optionally: first 1–2 sections of body text (if present)

- Use cosine similarity.

### Secondary: Lexical / Metadata Heuristics (Hybrid Fallback)

Even embedding similarity can fail when metadata is weak. Always include heuristics:

- exact name match
- normalized name match (case-insensitive, punctuation removed)
- high tag overlap
- high keyword overlap in descriptions
- identical tool lists (if present)

---

# Confidence Tiers (Mandatory)

All similarity outputs must be classified into **confidence tiers**.

## Tier Definitions

### `high`

Use when:

- YAML is valid for both skills
- similarity score >= 0.90
- AND either:
  - name match is strong, OR
  - description overlap is strong, OR
  - tags overlap is strong

Interpretation: likely near-duplicate.

### `medium`

Use when:

- YAML is valid for both skills
- similarity score between 0.80 and 0.90
- overlap is meaningful but not decisive

Interpretation: overlapping scope, may share purpose.

### `low`

Use when:

- YAML is valid for both skills
- similarity score between 0.70 and 0.80
- overlap is weak or driven by generic words

Interpretation: related but probably not duplicate.

### `invalid-metadata`

Use when:

- YAML is invalid OR missing key fields (`name`, `description`)

Interpretation: similarity result is unreliable.

---

# Similarity Pair Classification (Mandatory)

Each similar pair must be classified as:

- `near_duplicate` (merge candidates)
- `overlapping` (too similar, but distinct)
- `related` (share domain)
- `unrelated`

## Rules

### near_duplicate

- high confidence
- same intent + same deliverable outputs

### overlapping

- medium confidence
- similar topic but different output format or process

### related

- low confidence
- same domain but different goals

### unrelated

- similarity was likely accidental or generic

---

# Important Rule: Do NOT Recommend Dedup Purely Due to Vague Metadata

If:

- skill has a unique name
- but description/tags are vague

Then:

- flag as "metadata weakness"
- do **NOT** recommend deduplication

Deduplication should only be recommended when similarity is driven by **clear semantic overlap**, not by missing metadata.

---

# Delegation and Parallelization (Scalable for Thousands of Skills)

This skill MUST use delegation when the skill count is large.

## Pipeline Overview (Two-Phase, Safe)

### Phase 1: Shard-Safe Per-Skill Processing (Parallelizable)

Split skills into shards of 200–500 skills.

Each shard agent must:

- parse YAML frontmatter
- validate required fields
- normalize text
- generate embeddings
- compute metadata quality score

Shard outputs:

- `skill_id`
- `metadata_valid`
- `metadata_quality_score`
- `warnings`
- `embedding_vector` (or embedding id/reference)

**No similarity comparisons happen in shards.**

This avoids missing cross-shard duplicates.

---

### Phase 2: Global Similarity Retrieval (Coordinator Only)

A coordinator agent must:

- collect all embeddings from shards
- build a single global ANN/vector index
- for each skill, retrieve Top-K nearest neighbors globally

Default:

- `K = 30`

If metadata is weak:

- `K = 50`

This guarantees that skills in different shards are still compared.

---

## Why This Prevents Missed Duplicates

Sharding is only used for:

- YAML validation
- embedding creation
- metadata scoring

Similarity comparisons are always performed **globally** via ANN retrieval.

---

# Candidate Reduction Strategy (Mandatory)

Never compute O(n²) comparisons.

Instead:

1. Build global ANN index
2. Retrieve Top-K candidates per skill
3. Perform deeper pairwise scoring only on those candidates

Optional: Always include lexical candidates:

- same normalized name
- shared unique tags
- shared unique keywords

---

# Output Requirements

## `_skill_similarity_results.json`

Each record must include:

- `skill_a`
- `skill_b`
- `embedding_similarity_score`
- `lexical_overlap_score` (if computed)
- `confidence_tier` (`high|medium|low|invalid-metadata`)
- `pair_classification` (`near_duplicate|overlapping|related|unrelated`)
- `dedup_recommendation` (`true|false`)
- `reasoning_summary` (short)

## `_skill_similarity_audit_report.md`

Must include:

- total skills processed
- count invalid YAML
- count weak metadata
- distribution of confidence tiers
- top 20 near-duplicate recommendations
- list of "weak metadata but unique name" skills

---

# Quality Scoring (Metadata Reliability)

Assign a score from 0 to 100:

- +30 YAML parses successfully
- +20 has `name`
- +20 has `description` >= 20 chars
- +10 has >= 3 tags
- +10 has version
- +10 has clear outputs list

If score < 60 => "weak metadata"

---

# Stop Conditions

If invalid YAML count > 10%:

- warn that similarity analysis is likely unreliable
- recommend metadata normalization before dedup actions
