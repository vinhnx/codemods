---
name: axum-0-7-to-0-8
description: Migrate Rust axum routing path syntax from v0.7 to v0.8. Rewrites route path parameters from colon-style (/:id) to brace-style (/{id}) and wildcard paths from /*rest to /{*rest}. Use this when a Rust project uses axum 0.7 and needs to upgrade to 0.8.
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

Automates the route path syntax change in the axum 0.7 → 0.8 migration for Rust projects.

### Path parameter syntax
- `/:param` → `/{param}`
- `/*rest` → `/{*rest}`

### Applies to these method calls
- `.route("...", ...)`
- `.route_service("...", ...)`
- `.nest("...", ...)`
- `.nest_service("...", ...)`

Handles both normal string literals (`"..."`) and raw string literals (`r"..."`, `r#"..."#`).

Only processes files that contain axum imports (`use axum` or `axum::`), avoiding false rewrites in non-axum code.

## How to invoke

```bash
npx codemod@latest run axum-0-7-to-0-8 --target /path/to/rust/project
```

Or via local workflow:
```bash
npx codemod@latest workflow run -w workflow.yaml --target /path/to/rust/project
```

## Manual follow-up required

After running:
1. Update `Cargo.toml` to `axum = "0.8"`
2. Review route strings outside `.route`, `.route_service`, `.nest`, `.nest_service`
3. Check `Option<Path<T>>` or optional extractor usage for behavior changes
4. Review custom `FromRequest` / `FromRequestParts` impls relying on `#[async_trait]`
5. Run `cargo check` and `cargo test`

## Reference

For the full list of manual follow-up steps, remaining API renames, and a verification checklist, read `references/migration-guide.md`.

## Limitations

Does not handle:
- Route strings stored in variables or constants
- Handler signature changes
- Middleware API changes
- Extractor changes beyond routing paths
