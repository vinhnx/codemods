# tree-sitter 0.24 → 0.25 API Changes

## Quick Reference

| Category | Change | Automated |
|---|---|---|
| Rust method | `node.child_containing_descendant(d)` → `child_with_descendant` | ✅ |
| Rust UFCS | `Node::child_containing_descendant(...)` → `child_with_descendant` | ✅ |
| C FFI extern | `ts_node_child_containing_descendant` → `ts_node_child_with_descendant` | ✅ |
| C FFI call | `ts_node_child_containing_descendant(p, d)` | ✅ |
| Cargo.toml | `tree-sitter = "0.24"` → `"0.25"` | ✅ |
| New TSInput field | `decode` field added (mandatory) | ❌ Manual |
| Deprecated Rust | `Parser::parse()` → `parse_with_options()` | ❌ Manual |
| Deprecated Rust | `QueryCursor::matches()` → `matches_with_options()` | ❌ Manual |
| Deprecated Rust | Timeout/cancellation → progress callback | ❌ Manual |
| ABI | Bumped to 15 — grammar regen needed | ❌ Manual |
| Web JS/TS | `pattern` → `patternIndex` | ❌ Manual |
| Web JS/TS | `Language.query()` → `new Query()` | ❌ Manual |

## Release Date

2025-02-01

## GitHub Release

https://github.com/tree-sitter/tree-sitter/releases/tag/v0.25.0
