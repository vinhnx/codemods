---
name: rand-0-8-to-0-9
description: Migrate Rust rand crate usage from v0.8 to v0.9. Handles thread_rng → rng constructor rename and all gen* method renames. Use this when a Rust project uses rand 0.8 and needs to upgrade to 0.9.
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

Automates the deterministic renames in the rand 0.8 → 0.9 migration for Rust projects.

### Constructor
- `rand::thread_rng()` → `rand::rng()`
- `thread_rng()` → `rng()` (when imported from `rand`)
- `use rand::thread_rng;` → `use rand::rng;`
- Grouped imports: `use rand::{..., thread_rng, ...}` → `use rand::{..., rng, ...}`
- Aliased imports: `thread_rng as foo` → `rng as foo`

### Method renames
- `.gen(...)` → `.random(...)`
- `.gen_range(...)` → `.random_range(...)`
- `.gen_bool(...)` → `.random_bool(...)`
- `.gen_ratio(...)` → `.random_ratio(...)`
- `Rng::gen*(...)` qualified calls — all renamed equivalently

## How to invoke

```bash
npx codemod@latest run rand-0-8-to-0-9 --target /path/to/rust/project
```

Or via local workflow:
```bash
npx codemod@latest workflow run -w workflow.yaml --target /path/to/rust/project
```

## Manual follow-up required

After running:
1. Update `Cargo.toml` to `rand = "0.9"`
2. Run `cargo check` and `cargo test`
3. Review any `.gen`-named methods unrelated to rand (potential false positives)

## Reference

For the full list of manual follow-up steps, remaining API renames, and a verification checklist, read `references/migration-guide.md`.

## Limitations

Only covers the most common renames. Does not handle:
- Custom RNG implementations beyond the standard `Rng` trait
- Deprecated distribution types or changed distribution APIs
- `SmallRng`, `StdRng`, or `SeedableRng` API changes
