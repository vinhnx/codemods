# clap v3 → v4 Migration Reference

Use this to handle everything the codemod cannot automate.

## What the codemod already handles

- `#[clap(...)]` on structs/enums → `#[command(...)]`
- `#[clap(...)]` on fields → `#[arg(...)]`
- `arg_enum` → `value_enum`, `ArgEnum` derive → `ValueEnum`
- `.takes_value(true)` → `.num_args(1)`
- `.multiple_values(true)` → `.num_args(1..)`
- `.min_values(N)` → `.num_args(N..)`
- `.max_values(N)` → `.num_args(1..=N)`
- `.number_of_values(N)` → `.num_args(N)`
- `.multiple(true)` → `.num_args(1..)`
- Removes `.takes_value(false)`, `.require_value_delimiter(true)`, `.setting(AppSettings::ColoredHelp)`
- `ErrorKind::EmptyValue` → `ErrorKind::InvalidValue`
- `ErrorKind::UnrecognizedSubcommand` → `ErrorKind::InvalidSubcommand`
- Cleans up unused `AppSettings` imports

---

## What requires manual follow-up

### 1. Cargo.toml

```toml
# v3
clap = { version = "3", features = ["derive"] }

# v4
clap = { version = "4", features = ["derive"] }
# Remove `deprecated` feature if present
```

### 2. ArgMatches API (not automated)

| v3 | v4 |
|----|-----|
| `matches.value_of("arg")` | `matches.get_one::<String>("arg").map(|s| s.as_str())` |
| `matches.values_of("arg")` | `matches.get_many::<String>("arg")` |
| `matches.is_present("arg")` | `matches.get_flag("arg")` or `matches.contains_id("arg")` |
| `matches.occurrences_of("arg")` | Use `ArgAction::Count`, then `matches.get_count("arg")` |

### 3. ArgAction — flags now require explicit action

v4 defaults to `ArgAction::Set` for all args. Flags that previously used `takes_value(false)` need explicit action:

```rust
// v3 — implicit flag
Arg::new("verbose").short('v').takes_value(false)

// v4 — explicit
Arg::new("verbose").short('v').action(ArgAction::SetTrue)
// or for count:
Arg::new("verbose").short('v').action(ArgAction::Count)
```

### 4. Remaining ErrorKind renames (not automated)

| v3 | v4 |
|----|-----|
| `ErrorKind::MissingArgumentOrSubcommand` | `ErrorKind::DisplayHelpOnMissingArgumentOrSubcommand` |
| `ErrorKind::HelpDisplayed` | `ErrorKind::DisplayHelp` |
| `ErrorKind::VersionDisplayed` | `ErrorKind::DisplayVersion` |

### 5. AppSettings — most are now defaults, some still exist

These are now on by default in v4 (safe to remove any `.setting()` calls):

- `AppSettings::StrictUtf8` (now default; `AllowInvalidUtf8` removed)
- `AppSettings::UnifiedHelpMessage`
- `AppSettings::ColoredHelp` (handled by codemod)
- `AppSettings::VersionlessSubcommands`
- `AppSettings::PropagateGlobalValuesDown`
- `AppSettings::DeriveDisplayOrder`

Some `AppSettings` variants still exist in v4 — do not blindly remove all of them.

### 6. Help template changes

v4 removes name/version/author from the default help template. If you relied on the defaults or used `{unified}` in custom templates, update accordingly. The placeholder changed from `{subcommands}` to `{subcommand}` (singular).

### 7. `Arg::short()` now takes `char`

```rust
// v3
.short("v")

// v4
.short('v')
```

### 8. Lifetimes removed from `Command`, `Arg`, `ArgGroup`

If you stored these in structs with explicit lifetimes, remove them. Types now assume `'static`.

### 9. Deprecated / removed APIs

| v3 | v4 |
|----|-----|
| `Arg::from_usage("...")` | Use builder API directly |
| `clap_app!` macro | Use derive or builder API |
| YAML API (`load_yaml!`) | Removed entirely |
| `App::new(...)` | `Command::new(...)` |

### 10. Subcommand terminology

"Subcommand" is now called "Command" in help output and some API names. The `#[clap(subcommand)]` attribute on a field becomes `#[command(subcommand)]` (handled by the codemod), but custom help text referencing "subcommand" may need updating.

---

## Verification checklist

After running the codemod:
- [ ] `Cargo.toml` updated to `clap = "4"`
- [ ] `deprecated` feature removed
- [ ] `cargo check` passes
- [ ] All `ArgMatches::value_of` / `values_of` / `is_present` calls updated
- [ ] All flag arguments have explicit `ArgAction`
- [ ] All `ErrorKind` references checked
- [ ] Custom help templates reviewed
- [ ] `cargo test` passes
