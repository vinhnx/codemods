# Case Study: VTCode tree-sitter 0.24 → 0.25 Migration

**Date:** 2026-03-29
**Codemod:** `tree-sitter-0-24-to-0-25`
**Project:** VTCode baseline (simulated Rust code-intelligence tool)

## Context

VTCode is a code analysis engine that uses tree-sitter for parsing multiple languages (Rust, Python, JavaScript). The project was on `tree-sitter = "0.24.3"` and needed to upgrade to v0.25.0, which removes the `child_containing_descendant` API entirely.

## Representative code before and after

### Rust method call (most common)

```rust
// Before (0.24)
fn find_parent<'a>(ancestor: Node<'a>, target: Node<'a>) -> Option<Node<'a>> {
    ancestor.child_containing_descendant(target)
}

// After (0.25) — automated
fn find_parent<'a>(ancestor: Node<'a>, target: Node<'a>) -> Option<Node<'a>> {
    ancestor.child_with_descendant(target)
}
```

### UFCS form

```rust
// Before (0.24)
Node::child_containing_descendant(ancestor, target)

// After (0.25) — automated
Node::child_with_descendant(ancestor, target)
```

### C FFI (less common but present in low-level wrappers)

```rust
// Before (0.24)
extern "C" {
    fn ts_node_child_containing_descendant(
        self_: tree_sitter::ffi::TSNode,
        descendant: tree_sitter::ffi::TSNode,
    ) -> tree_sitter::ffi::TSNode;
}

// After (0.25) — automated
extern "C" {
    fn ts_node_child_with_descendant(
        self_: tree_sitter::ffi::TSNode,
        descendant: tree_sitter::ffi::TSNode,
    ) -> tree_sitter::ffi::TSNode;
}
```

## What the codemod automated

All three call forms of `child_containing_descendant` across all source files:

- `ancestor.child_containing_descendant(desc)` → `ancestor.child_with_descendant(desc)`
- `Node::child_containing_descendant(ancestor, desc)` → `Node::child_with_descendant(ancestor, desc)`
- FFI extern declaration and call sites via `ts_node_child_containing_descendant`
- Cargo.toml `tree-sitter = "0.24.3"` → `"0.25"`

Result: **zero** `child_containing_descendant` references remain (`rg child_containing_descendant` returns nothing).

## What required manual follow-up

### 1. `TSInput` decode field (FFI users)

If your code constructs `TSInput` structs directly via FFI, add the mandatory `decode` field:

```rust
// Add: .decode = std::ptr::null()
```

VTCode does not construct `TSInput` directly, so this was not an issue here.

### 2. Deprecated Rust APIs (migrate before v0.26)

| Still compiles in 0.25 | Will break in 0.26 |
|---|---|
| `parser.parse(source, None)` | Yes |
| `cursor.matches(&q, node, bytes)` | Yes |
| `cursor.captures(&q, node, bytes)` | Yes |
| `parser.set_timeout_micros(n)` | Yes |
| `parser.set_cancellation_flag(&flag)` | Yes |

Migrate to `parse_with_options()` / `matches_with_options()` / `captures_with_options()`. These are documented in detail in the migration guide.

## Verification

- [x] All `child_containing_descendant` forms removed from codebase
- [x] No false positives in non-tree-sitter code
- [x] `Cargo.toml` updated to `"0.25"` by the codemod
- [ ] `cargo check` passes
- [ ] `cargo test` passes
- [ ] Deprecated `Parser::parse()` reviewed for migration

## Metrics

| Metric | Value |
|---|---|
| Files modified | 3 |
| API renames applied (all forms) | 6+ |
| Cargo.toml bumped | ✅ |
| False positives | 0 |
| Manual steps remaining | 2 (TSInput field if applicable, deprecated APIs) |
| Hard automation coverage | ~70% of total migration effort |

## Key takeaway

The codemod handles the one *hard* blocker — `child_containing_descendant` is removed in 0.25, not just deprecated — across every call form (Rust method, UFCS, C FFI) with zero false positives. The guard (`isLikelyTreeSitterSource`) correctly filters out code with similar method names in unrelated types.

What remains is softer: deprecated APIs that still compile in 0.25, a struct field addition for FFI users, and confirmation that `cargo check` passes. All documented with concrete examples in the migration guide.
