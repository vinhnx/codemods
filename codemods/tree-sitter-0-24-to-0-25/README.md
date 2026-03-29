# tree-sitter-0-24-to-0-25

Migrate Rust `tree-sitter` crate usage from v0.24 to v0.25.

## What it does

This codemod automates the deterministic API changes in the tree-sitter 0.24 → 0.25 migration:

### Automated changes

- **Removed C API**: `ts_node_child_containing_descendant` → `ts_node_child_with_descendant` (all usages including FFI extern declarations, call sites, and wrapper functions)
- **Cargo.toml** (planned): Bumps `tree-sitter` dependency from `0.24.x` to `0.25` — the transform logic is implemented but requires TOML language support in the Codemod CLI

### Not automated (requires manual review)

- `TSInput` struct now requires a `decode` field (pass `NULL` for built-in decoders)
- Deprecated Rust API methods (`Parser::parse()` → `parse_with_options()`, etc.)
- ABI 15 parser regeneration for grammar maintainers
- Web bindings (`web-tree-sitter`) TypeScript rewrite changes

## Usage

```bash
npx codemod@latest run tree-sitter-0-24-to-0-25 --target /path/to/rust/project
```

Or locally:

```bash
npx codemod@latest workflow run -w workflow.yaml --target /path/to/rust/project
```

## Testing

```bash
npx codemod jssg test -l rust ./scripts/codemod.ts -v --strictness loose
```

## Manual follow-up

After running:

1. Update `Cargo.toml` to `tree-sitter = "0.25"` (verify)
2. If using FFI with `TSInput`, add the `decode` field
3. Migrate deprecated `Parser::parse()` to `parse_with_options()` with `ParseOptions`
4. Migrate deprecated `QueryCursor::matches()`/`captures()` to `*_with_options()`
5. Replace timeout/cancellation with progress callbacks
6. Run `cargo check` and `cargo test`

See `agents/skill/tree-sitter-0-24-to-0-25/references/migration-guide.md` for full details.

## References

- [tree-sitter v0.25.0 Release](https://github.com/tree-sitter/tree-sitter/releases/tag/v0.25.0)
- [tree-sitter Rust API Docs](https://docs.rs/tree-sitter)
