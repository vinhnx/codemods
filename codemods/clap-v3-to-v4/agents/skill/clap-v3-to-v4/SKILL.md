---
name: clap-v3-to-v4
description: Migrate Rust clap CLI parser from v3 to v4. Handles derive attribute renames, builder API updates, ErrorKind renames, and AppSettings cleanup. Use this when a Rust project uses clap v3 and needs to upgrade to v4.
allowed-tools:
  - bash
  - str_replace_based_edit_tool
  - glob
  - sequentialthinking
  - task_done
codemod-compatibility: ">=1.0.0"
codemod-skill-version: "1.0.6"
---

## What this codemod does

Automates ~80% of the clap v3 → v4 migration for Rust projects.

### Derive API
- `#[clap(...)]` on structs/enums → `#[command(...)]`
- `#[clap(...)]` on fields → `#[arg(...)]`
- `arg_enum` → `value_enum`, `ArgEnum` derive → `ValueEnum`

### Builder API
- `.takes_value(true)` → `.num_args(1)`
- `.multiple_values(true)` → `.num_args(1..)`
- `.min_values(N)` → `.num_args(N..)`
- `.max_values(N)` → `.num_args(1..=N)`
- `.number_of_values(N)` → `.num_args(N)`
- `.multiple(true)` → `.num_args(1..)`
- Removes `.takes_value(false)`, `.require_value_delimiter(true)`, `.setting(AppSettings::ColoredHelp)`
- Cleans up `AppSettings` imports when no longer needed

### Error kinds
- `ErrorKind::EmptyValue` → `ErrorKind::InvalidValue`
- `ErrorKind::UnrecognizedSubcommand` → `ErrorKind::InvalidSubcommand`

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
1. Update `Cargo.toml` to `clap = "4"` (remove `deprecated` feature if present)
2. Run `cargo check` — fix remaining compile errors
3. Verify `num_args` ranges match intended behavior
4. Check `ArgAction` usage — v4 changed default actions for flags
5. Update custom help templates if used
6. Run `cargo test`

## Reference

For the full list of manual follow-up steps, remaining API renames, and a verification checklist, read `references/migration-guide.md`.

## Limitations

Does not handle:
- Custom `ArgAction` conversions
- Changed default flag behavior (flags are now `ArgAction::SetTrue` by default)
- Help template format changes
- All `AppSettings` variants (only `ColoredHelp` is auto-removed)
