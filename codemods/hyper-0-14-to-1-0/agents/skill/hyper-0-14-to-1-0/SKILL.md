---
name: hyper-0-14-to-1-0
description: Migrate Rust hyper from v0.14 to v1.x for deterministic legacy client import and type-path rewrites. Use this when a Rust project needs help with the source-level hyper 1 migration.
codemod-compatibility: ">=1.0.0"
codemod-skill-version: "1.0.3"
compatibility: ">=1.0.0"
metadata:
  version: "1.0.3"
allowed-tools: Bash, Glob, Read
---

## What this codemod does

Automates deterministic parts of the hyper 0.14 -> 1.x migration for Rust projects.

### Client import and path rewrites
- `use hyper::Client;` -> `use hyper_util::client::legacy::Client;`
- `use hyper::client::HttpConnector;` -> `use hyper_util::client::legacy::connect::HttpConnector;`
- `use hyper::client::connect::HttpConnector;` -> `use hyper_util::client::legacy::connect::HttpConnector;`
- Grouped imports are split when they contain migrated symbols
- Fully-qualified paths are rewritten:
  - `hyper::Client` -> `hyper_util::client::legacy::Client`
  - `hyper::client::HttpConnector` -> `hyper_util::client::legacy::connect::HttpConnector`

Only processes source files that contain hyper imports/usages to avoid false rewrites in non-hyper code.

## Implementation notes

This package runs AST-backed `js-ast-grep` transforms for Rust source. `Cargo.toml` changes are manual follow-up because the current JSSG runner does not support TOML workflows.

## How to invoke

```bash
bunx codemod@latest hyper-0-14-to-1-0 --target /path/to/rust/project
```

Or via local workflow:
```bash
bunx codemod@latest workflow run -w workflow.yaml --target /path/to/rust/project
```

## Manual follow-up required

After running:
1. Review client builder initialization and executor wiring for hyper v1
2. Migrate body utilities (`to_bytes`, body collection, and concrete body types) where needed
3. Confirm `hyper-util` feature flags are correct for your runtime/protocol setup
5. Run `cargo check` and `cargo test`

## Reference

For the full list of manual follow-up steps, remaining API renames, and a verification checklist, read `references/migration-guide.md`.

## Limitations

Does not handle:
- Server API migration patterns (for example old server builder patterns)
- Full body API migration for all call sites
- TLS or connector stack customization migration
