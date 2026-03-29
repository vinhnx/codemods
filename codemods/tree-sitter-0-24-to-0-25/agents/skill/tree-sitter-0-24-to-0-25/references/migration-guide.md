# tree-sitter 0.24 → 0.25 Migration Guide

## Overview

tree-sitter v0.25.0 (released 2025-02-01) is a large release with breaking changes. This guide covers all changes that need manual attention after running the codemod.

## Breaking Changes

### 1. Removed: `ts_node_child_containing_descendant`

**Automated by codemod.** This C API function was removed. Use `ts_node_child_with_descendant` instead, which has nearly the same behavior but can also return the `descendant` node itself.

```c
// Before (0.24)
TSNode child = ts_node_child_containing_descendant(parent, descendant);

// After (0.25)
TSNode child = ts_node_child_with_descendant(parent, descendant);
```

### 2. New required field in `TSInput`

**Manual action required.** `TSInput` now includes a mandatory `decode` field of type `TSDecodeFunction`. If you construct `TSInput` structs directly, pass `NULL` to use the built-in UTF-8/UTF-16 decoders.

```c
// Before (0.24)
TSInput input = {
    .payload = my_payload,
    .read = my_read_fn,
    .encoding = TSInputEncodingUTF8,
};

// After (0.25)
TSInput input = {
    .payload = my_payload,
    .read = my_read_fn,
    .encoding = TSInputEncodingUTF8,
    .decode = NULL,  // use built-in decoder
};
```

### 3. Deprecated Rust API functions

**Manual action recommended.** These Rust binding functions are deprecated but still compile. Migrate before 0.26 when they will be removed:

| Deprecated | Replacement |
|---|---|
| `Parser::parse()` | `Parser::parse_with_options()` with `ParseOptions` |
| `Parser::parse_utf16()` | `Parser::parse_utf16_with_options()` with `ParseOptions` |
| `Parser::timeout_micros()` | Use `ParseOptions` with progress callback |
| `Parser::set_timeout_micros()` | Use `ParseOptions` with progress callback |
| `Parser::cancellation_flag()` | Use `ParseOptions` with progress callback |
| `Parser::set_cancellation_flag()` | Use `ParseOptions` with progress callback |
| `QueryCursor::matches()` | `QueryCursor::matches_with_options()` |
| `QueryCursor::captures()` | `QueryCursor::captures_with_options()` |
| `QueryCursor::set_byte_range()` | `QueryCursorOptions` |
| `QueryCursor::set_point_range()` | `QueryCursorOptions` |

Example migration:

```rust
// Before (0.24) — deprecated
let tree = parser.parse(source, None).unwrap();

// After (0.25) — preferred
use tree_sitter::{ParseOptions, InputEdit};
let tree = parser.parse_with_options(
    &ParseOptions {
        progress_callback: None,
    },
    source,
    None,
).unwrap();
```

### 4. ABI version bumped to 15

**Manual action required if maintaining a grammar.** If you maintain a tree-sitter grammar, regenerate the parser with `tree-sitter generate` to produce ABI 15 compatible code. This requires a `tree-sitter.json` config file.

### 5. Web bindings (`web-tree-sitter`) rewrite

**Manual action required for JS/TS users.** The web bindings were rewritten in TypeScript:

- `QueryMatch.pattern` → `QueryMatch.patternIndex`
- `Language.query()` deprecated in favor of `new Query(language, source)`
- Both CJS and ESM modules are now published
- Source maps and debug builds are now published

### 6. Supertype API added

**New feature, no action required.** `Language::node_kind_is_supertype()` is available for checking if a node kind is a supertype. Useful for advanced query patterns.

### 7. Progress callback replaces timeout/cancellation

**Manual action recommended.** The timeout and cancellation flag mechanisms are deprecated in favor of progress callbacks:

```rust
// Before (0.24)
parser.set_timeout_micros(100_000);
let tree = parser.parse(source, None);

// After (0.25)
use tree_sitter::ParseOptions;
let tree = parser.parse_with_options(
    &ParseOptions {
        progress_callback: Some(&|_| true), // return false to cancel
    },
    source,
    None,
);
```

## Verification Checklist

- [ ] `cargo check` passes
- [ ] `cargo test` passes
- [ ] `Cargo.toml` has `tree-sitter = "0.25"`
- [ ] No remaining `ts_node_child_containing_descendant` references
- [ ] If using FFI: all `TSInput` structs have `decode` field
- [ ] If using `Parser::parse()`: consider migrating to `parse_with_options()`
- [ ] If maintaining a grammar: regenerated with `tree-sitter generate`
- [ ] If using web bindings: updated `pattern` → `patternIndex` and `Language.query()` → `new Query()`
