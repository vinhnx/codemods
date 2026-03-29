---
name: tree-sitter-0-24-to-0-25
description: Migrate Rust tree-sitter crate usage from v0.24 to v0.25. Handles removed API renames across all call forms (C FFI, Rust method calls, UFCS), plus Cargo.toml dependency bump. Use this when a Rust project uses tree-sitter 0.24 and needs to upgrade to 0.25.
codemod-compatibility: ">=1.0.0"
codemod-skill-version: "1.0.4"
compatibility: ">=1.0.0"
metadata:
  version: "1.0.4"
allowed-tools: Bash, Glob, Read
---

## What this codemod does

Automates the deterministic API renames in the tree-sitter 0.24 → 0.25 migration for Rust projects.

### Removed API — all call forms automated

`child_containing_descendant` was removed in v0.25. The codemod handles every form it appears in:

| Form | Before | After |
|---|---|---|
| Rust method call | `node.child_containing_descendant(desc)` | `node.child_with_descendant(desc)` |
| Rust UFCS | `Node::child_containing_descendant(node, desc)` | `Node::child_with_descendant(node, desc)` |
| C FFI extern declaration | `fn ts_node_child_containing_descendant(...)` | `fn ts_node_child_with_descendant(...)` |
| C FFI call site | `ts_node_child_containing_descendant(parent, desc)` | `ts_node_child_with_descendant(parent, desc)` |
| Qualified FFI path | `tree_sitter::ffi::ts_node_child_containing_descendant(...)` | `tree_sitter::ffi::ts_node_child_with_descendant(...)` |

### Cargo.toml dependency bump (automated)

- `tree-sitter = "0.24.x"` → `tree-sitter = "0.25"`
- `tree-sitter = { version = "0.24", ... }` → `tree-sitter = { version = "0.25", ... }`

## How to invoke

```bash
npx codemod@latest run tree-sitter-0-24-to-0-25 --target /path/to/rust/project
```

Or via local workflow:
```bash
npx codemod@latest workflow run -w workflow.yaml --target /path/to/rust/project
```

## Manual follow-up required

After running:
1. **Verify `Cargo.toml`** shows `tree-sitter = "0.25"` (confirm the bump applied)
2. **If using FFI `TSInput` struct construction**, add the new mandatory `decode` field (pass `NULL` for built-in UTF-8/UTF-16 decoders)
3. **Deprecated: `Parser::parse()`** → migrate to `parse_with_options()` with `ParseOptions` before v0.26 removes it
4. **Deprecated: `QueryCursor::matches()`/`captures()`** → migrate to `*_with_options()` before v0.26
5. **Deprecated: `Parser::set_timeout_micros()` / `set_cancellation_flag()`** → replace with progress callbacks in `ParseOptions` before v0.26
6. **Grammar maintainers**: regenerate parser with `tree-sitter generate` to produce ABI 15
7. Run `cargo check` and `cargo test`

## Reference

For the full list of manual follow-up steps, the complete change table, and a verification checklist, read [`references/migration-guide.md`](references/migration-guide.md).

## Limitations

Does not handle:
- `TSInput` decode field addition (requires manual struct construction)
- Deprecated `*_with_options` migration (complex — requires inserting a new `ParseOptions` argument)
- Web bindings (`web-tree-sitter`) TypeScript changes (`pattern` → `patternIndex`, `Language.query()` → `new Query()`)
- ABI 15 parser regeneration for grammar repositories
