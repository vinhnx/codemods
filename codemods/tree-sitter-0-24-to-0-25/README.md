# tree-sitter-0-24-to-0-25

Migrate Rust `tree-sitter` crate usage from v0.24 to v0.25.

## What it does

### Automated

- **Rust method call**: `node.child_containing_descendant(desc)` → `node.child_with_descendant(desc)`
- **Rust UFCS**: `Node::child_containing_descendant(node, desc)` → `Node::child_with_descendant(node, desc)`
- **C FFI extern declaration**: `fn ts_node_child_containing_descendant(...)` → `fn ts_node_child_with_descendant(...)`
- **C FFI call site**: `ts_node_child_containing_descendant(p, d)` → `ts_node_child_with_descendant(p, d)`

### Manual follow-up required

- Update `Cargo.toml`: `tree-sitter = "0.25"` (manual follow-up)
- `TSInput` struct now has a mandatory `decode` field — pass `NULL` for built-in decoders
- Deprecated `Parser::parse()` → `parse_with_options()` before v0.26 removes it
- Deprecated `QueryCursor::matches()`/`captures()` → `*_with_options()` before v0.26
- Deprecated timeout/cancellation APIs → progress callback in `ParseOptions` before v0.26
- ABI 15 parser regeneration for grammar maintainers (`tree-sitter generate`)
- Web bindings: `match.pattern` → `match.patternIndex`, `Language.query()` → `new Query()`

## Usage

```bash
bunx codemod@latest tree-sitter-0-24-to-0-25 --target /path/to/rust/project
```

Or locally:

```bash
bunx codemod@latest workflow run -w workflow.yaml --target /path/to/rust/project
```

## Testing

```bash
bunx codemod jssg test -l rust ./scripts/codemod.ts -v --strictness loose
```

## References

- [tree-sitter v0.25.0 Release](https://github.com/tree-sitter/tree-sitter/releases/tag/v0.25.0)
- [Full migration guide](agents/skill/tree-sitter-0-24-to-0-25/references/migration-guide.md)
