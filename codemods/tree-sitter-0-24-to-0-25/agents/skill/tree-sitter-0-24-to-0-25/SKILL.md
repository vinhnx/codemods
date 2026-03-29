---
name: tree-sitter-0-24-to-0-25
description: Migrate Rust tree-sitter crate usage from v0.24 to v0.25. Handles removed API renames, Cargo.toml dependency bump, and flags deprecated APIs for manual review. Use this when a Rust project uses tree-sitter 0.24 and needs to upgrade to 0.25.
allowed-tools:
  - bash
  - str_replace_based_edit_tool
  - glob
  - sequentialthinking
  - task_done
codemod-compatibility: ">=1.0.0"
codemod-skill-version: "1.0.0"
---

## What this codemod does

Automates the deterministic API changes in the tree-sitter 0.24 → 0.25 migration for Rust projects.

### Removed API renames
- `ts_node_child_containing_descendant` → `ts_node_child_with_descendant`

### Cargo.toml dependency bump
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
1. Verify `Cargo.toml` shows `tree-sitter = "0.25"`
2. If using `tree-sitter-language`, update to `"0.1"` or latest
3. If using FFI with `TSInput`, add the new mandatory `decode` field (pass `NULL` for built-in UTF-8/UTF-16)
4. If calling deprecated `Parser::parse()` / `Parser::parse_utf16()`, migrate to `parse_with_options()` / `parse_utf16_with_options()` with `ParseOptions`
5. If calling deprecated `QueryCursor::matches()` / `captures()`, migrate to `*_with_options()` with `QueryCursorOptions`
6. Run `cargo check` and `cargo test`

## Reference

For the full list of manual follow-up steps, remaining API renames, and a verification checklist, read `references/migration-guide.md`.

## Limitations

Only covers deterministic renames. Does not handle:
- `TSInput` decode field addition (requires manual struct construction)
- Deprecated `*_with_options` migration (requires understanding call context)
- Web bindings (`web-tree-sitter`) TypeScript rewrite changes
- ABI 15 parser regeneration (requires `tree-sitter generate`)
