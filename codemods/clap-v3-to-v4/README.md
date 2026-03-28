# clap-v3-to-v4

Automate 80%+ of the Rust [clap](https://github.com/clap-rs/clap) CLI parser migration from v3 to v4.

## What it does

### Derive API transforms
- `#[clap(...)]` on structs/enums → `#[command(...)]`
- `#[clap(...)]` on fields → `#[arg(...)]`
- `arg_enum` → `value_enum`
- `ArgEnum` derives → `ValueEnum`
- Removes redundant `value_parser` and `action` attributes (implicit in v4)

### Builder API transforms
- `.takes_value(true)` → `.num_args(1)`
- `.multiple_values(true)` → `.num_args(1..)`
- `.min_values(N)` → `.num_args(N..)`
- `.max_values(N)` → `.num_args(1..=N)`
- `.number_of_values(N)` → `.num_args(N)`
- `.multiple(true)` → `.num_args(1..)`
- Removes `.takes_value(false)` (now default)
- Removes `.require_value_delimiter(true)` (use `.value_delimiter(',')`)
- Removes `.setting(AppSettings::ColoredHelp)` (now default)
- Removes now-unused `AppSettings` imports when `ColoredHelp` was the only use

### Error kind renames
- `ErrorKind::EmptyValue` → `ErrorKind::InvalidValue`
- `ErrorKind::UnrecognizedSubcommand` → `ErrorKind::InvalidSubcommand`

## Usage

```bash
# Validate the workflow
npx codemod@latest workflow validate -w workflow.yaml

# Dry run against your project
npx codemod@latest workflow run -w workflow.yaml --target /path/to/your/rust/project

# Run the published package from the registry
npx codemod@latest run clap-v3-to-v4 --target /path/to/your/rust/project
```

## Manual follow-up

After running, you should:

1. **Update `Cargo.toml`** to `clap = "4"` or the appropriate v4 table form if your project still depends on v3
2. **Remove the `deprecated` feature flag** if present
3. **Run `cargo check`** to catch remaining compile errors
4. **Verify `num_args` ranges** match your intended behavior
5. **Check `ArgAction` usage** — v4 changed default actions for flags
6. **Update custom help templates** — format changed in v4
7. **Remove unused imports** (e.g., `AppSettings` if no longer needed)
8. **Run `cargo test`** to verify behavior

## Development

```bash
# Run tests
npx codemod@latest jssg test -l rust ./scripts/codemod.ts -v --strictness loose

# Validate workflow
npx codemod@latest workflow validate -w workflow.yaml
```

## References

- [clap 4.0 announcement](https://epage.github.io/blog/2022/09/clap4/)
- [clap CHANGELOG migration guide](https://github.com/clap-rs/clap/blob/master/CHANGELOG.md#400---2022-09-28)
- [clap v4 docs](https://docs.rs/clap/4.0.0/clap/index.html)

## License

MIT
