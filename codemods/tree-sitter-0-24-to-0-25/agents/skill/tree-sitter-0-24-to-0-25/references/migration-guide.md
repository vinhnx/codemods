# tree-sitter 0.24 → 0.25 Migration Guide

## Overview

tree-sitter v0.25.0 (released 2025-02-01) is a large release with breaking changes. This guide covers everything that needs attention after running the codemod.

## What the codemod handles automatically

| Change | Automated |
|---|---|
| `node.child_containing_descendant(desc)` → `node.child_with_descendant(desc)` | ✅ |
| `Node::child_containing_descendant(node, desc)` → `Node::child_with_descendant(node, desc)` | ✅ |
| FFI: `fn ts_node_child_containing_descendant(...)` → `fn ts_node_child_with_descendant(...)` | ✅ |
| FFI call: `ts_node_child_containing_descendant(p, d)` → `ts_node_child_with_descendant(p, d)` | ✅ |
| Cargo.toml: `tree-sitter = "0.24.x"` → `"0.25"` | Manual follow-up |

## Breaking Changes — Manual Required

### 0. Cargo.toml

Update `tree-sitter` to `0.25` in your manifest. This codemod does not rewrite TOML.

### 1. `TSInput` decode field (FFI users only)

`TSInput` now includes a mandatory `decode` field. Pass `NULL` to use built-in UTF-8/UTF-16.

```c
// Before (0.24)
TSInput input = {
    .payload = my_payload,
    .read    = my_read_fn,
    .encoding = TSInputEncodingUTF8,
};

// After (0.25)
TSInput input = {
    .payload  = my_payload,
    .read     = my_read_fn,
    .encoding = TSInputEncodingUTF8,
    .decode   = NULL,
};
```

### 2. `child_containing_descendant` behaviour change

The new `child_with_descendant` has nearly the same behavior as the old function, with one difference: it can now also return the `descendant` node itself when the descendant is a direct child. Verify call sites where you assume the result is strictly a parent.

## Deprecated Rust APIs (will be removed in v0.26)

These compile cleanly in 0.25 but will be removed in 0.26. Migrate proactively.

### Parser

| Deprecated | Replacement |
|---|---|
| `parser.parse(source, old_tree)` | `parser.parse_with_options(source, old_tree, ParseOptions::default())` |
| `parser.parse_utf16(source, old_tree)` | `parser.parse_utf16_with_options(source, old_tree, ParseOptions::default())` |
| `parser.set_timeout_micros(n)` | Progress callback in `ParseOptions` |
| `parser.timeout_micros()` | Remove — no replacement needed with callbacks |
| `parser.set_cancellation_flag(&flag)` | Progress callback returning `false` to cancel |
| `parser.cancellation_flag()` | Remove — no replacement needed with callbacks |

Example migration for timeout/cancellation:

```rust
// Before (0.24)
parser.set_timeout_micros(100_000);
let tree = parser.parse(source, None);

// After (0.25)
use tree_sitter::{ParseOptions, ParseState};
let deadline = std::time::Instant::now() + std::time::Duration::from_micros(100_000);
let tree = parser.parse_with_options(
    source,
    None,
    ParseOptions {
        progress_callback: Some(&mut |_: ParseState| {
            std::time::Instant::now() < deadline
        }),
    },
);
```

### QueryCursor

| Deprecated | Replacement |
|---|---|
| `cursor.matches(&query, node, source)` | `cursor.matches_with_options(...)` with `QueryCursorOptions` |
| `cursor.captures(&query, node, source)` | `cursor.captures_with_options(...)` with `QueryCursorOptions` |
| `cursor.set_byte_range(range)` | `QueryCursorOptions::byte_range` |
| `cursor.set_point_range(range)` | `QueryCursorOptions::point_range` |

## ABI Version Bump to 15

**Grammar maintainers only.** Regenerate your parser:

```bash
# Requires tree-sitter.json in your repository
tree-sitter generate
```

ABI 15 adds the language name, version, supertype info, and reserved words to generated parsers. Requires `tree-sitter.json` config.

## Web Bindings (`web-tree-sitter`) Changes

**JavaScript/TypeScript users only.** The web bindings were rewritten in TypeScript:

| Before | After |
|---|---|
| `match.pattern` | `match.patternIndex` |
| `language.query(source)` | `new Query(language, source)` |
| CJS-only module | Both CJS and ESM published |

## Verification Checklist

- [ ] `cargo check` passes
- [ ] `cargo test` passes
- [ ] `Cargo.toml` has `tree-sitter = "0.25"`
- [ ] No remaining `child_containing_descendant` references (`rg child_containing_descendant`)
- [ ] No remaining `ts_node_child_containing_descendant` references
- [ ] FFI `TSInput` struct literals have `decode` field (if applicable)
- [ ] `Parser::parse()` usages reviewed for migration to `parse_with_options()`
- [ ] `QueryCursor::matches()`/`captures()` reviewed for migration to `*_with_options()`
- [ ] Grammar regenerated with ABI 15 (if maintaining a parser)
- [ ] Web binding `pattern` → `patternIndex` done (if using web bindings)
