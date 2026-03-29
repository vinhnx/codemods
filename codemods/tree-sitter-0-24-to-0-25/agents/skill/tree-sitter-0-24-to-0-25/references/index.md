# tree-sitter 0.24 → 0.25 API Changes

## Quick Reference

| Category | Change | Automated? |
|---|---|---|
| Removed C API | `ts_node_child_containing_descendant` → `ts_node_child_with_descendant` | ✅ Yes |
| Cargo.toml | `tree-sitter = "0.24"` → `"0.25"` | ✅ Yes |
| New TSInput field | `decode` field added (mandatory) | ❌ Manual |
| Deprecated Rust | `Parser::parse()` → `parse_with_options()` | ❌ Manual |
| Deprecated Rust | `QueryCursor::matches()` → `matches_with_options()` | ❌ Manual |
| Deprecated Rust | Timeout/cancellation → progress callback | ❌ Manual |
| ABI | Bumped to 15 | ❌ Grammar regen |
| Web | TypeScript rewrite | ❌ JS/TS only |
| Web | `pattern` → `patternIndex` | ❌ JS/TS only |
| Web | `Language.query()` → `new Query()` | ❌ JS/TS only |

## Release Date

2025-02-01

## GitHub

https://github.com/tree-sitter/tree-sitter/releases/tag/v0.25.0
