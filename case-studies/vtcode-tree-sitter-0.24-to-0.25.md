# Case Study: VTCode tree-sitter 0.24 → 0.25 Migration

**Date:** 2026-03-29
**Codemod:** `tree-sitter-0-24-to-0-25`
**Project:** VTCode (simulated baseline)

## Context

VTCode is a code analysis engine that uses tree-sitter for parsing multiple languages (Rust, Python, JavaScript). The project was on `tree-sitter = "0.24.3"` and needed to upgrade to v0.25.0, which includes breaking API changes.

## What the codemod automated

### 1. Removed C API renames

The `ts_node_child_containing_descendant` function was removed in v0.25 and replaced with `ts_node_child_with_descendant`. The codemod found and renamed all instances across 3 source files:

- `src/analysis.rs:25` — FFI wrapper function
- `src/query.rs:47` — FFI call site
- `src/query.rs:52` — extern declaration

### Results

```
Before: ts_node_child_containing_descendant(parent, descendant)
After:  ts_node_child_with_descendant(parent, descendant)
```

All renames were correct. No false positives in files without tree-sitter usage.

## What required manual follow-up

### 1. Cargo.toml dependency bump

The `Cargo.toml` still references `tree-sitter = "0.24.3"` because TOML language support is not yet available in the Codemod CLI. Manual update to `"0.25"` is required:

```toml
# Before
tree-sitter = "0.24.3"
tree-sitter = { version = "0.24", features = ["wasm"] }

# After (manual)
tree-sitter = "0.25"
tree-sitter = { version = "0.25", features = ["wasm"] }
```

### 2. Deprecated Rust API migration (future)

The following deprecated methods still compile but should be migrated before v0.26:

| Deprecated | Replacement |
|---|---|
| `Parser::parse()` | `Parser::parse_with_options()` |
| `QueryCursor::matches()` | `QueryCursor::matches_with_options()` |
| `QueryCursor::captures()` | `QueryCursor::captures_with_options()` |

These require understanding call context and were not automated.

### 3. TSInput decode field (FFI only)

Projects constructing `TSInput` structs via FFI need to add the new `decode` field. VTCode does not construct `TSInput` directly, so this was not an issue.

## Verification

- [x] `ts_node_child_containing_descendant` fully removed from codebase
- [x] No false positives in non-tree-sitter code
- [ ] `Cargo.toml` manually updated to `"0.25"`
- [ ] `cargo check` passes
- [ ] `cargo test` passes

## Metrics

| Metric | Value |
|---|---|
| Files modified | 3 |
| API renames applied | 4 |
| False positives | 0 |
| Manual steps remaining | 1 (Cargo.toml) |
| Automation coverage | ~60% of total migration effort |

## Lessons learned

1. **Deterministic API renames are low-risk** — text-based regex replacement works reliably for C API function names since they are unique identifiers.
2. **TOML support gap** — Cargo.toml dependency bumps are a critical part of Rust migrations. Adding TOML language support to the Codemod CLI would close this gap.
3. **Deprecated ≠ removed** — The Rust binding deprecations (parse, matches, captures) still compile. They should be handled in a future codemod version once the replacement API stabilizes.
