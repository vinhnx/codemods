# axum-0-7-to-0-8

Automate the highest-value deterministic part of the Rust [axum](https://github.com/tokio-rs/axum) migration from v0.7 to v0.8.

## What it does

### Route path syntax updates

- `/:id` -> `/{id}`
- `/*rest` -> `/{*rest}`
- Rewrites path strings passed to:
    - `.route(...)`
    - `.route_service(...)`
    - `.nest(...)`
    - `.nest_service(...)`
- Supports normal Rust string literals and raw string literals used in those route definitions

### Cargo.toml dependency updates

- `axum = "0.7.x"` -> `axum = "0.8"`
- `axum = { version = "0.7.x", ... }` -> `axum = { version = "0.8", ... }`

## Usage

```bash
# Validate the workflow
npx codemod@latest workflow validate -w workflow.yaml

# Dry run against your project
npx codemod@latest workflow run -w workflow.yaml --target /path/to/your/rust/project

# Run the package from the registry
npx codemod@latest run axum-0-7-to-0-8 --target /path/to/your/rust/project
```

## Manual follow-up

After running, you should:

1. Review `Cargo.toml` updates for uncommon axum dependency formatting not covered by deterministic rewrites
2. Review custom route strings outside `.route`, `.route_service`, `.nest`, and `.nest_service`
3. Check code using `Option<Path<T>>` or other optional extractors for behavior changes in axum 0.8
4. Review custom `FromRequest` and `FromRequestParts` implementations if they rely on `#[async_trait]`
5. Run `cargo check` and `cargo test`

## Development

```bash
# Run tests
npx codemod@latest jssg test -l rust ./scripts/codemod.ts -v --strictness loose
npx codemod@latest jssg test -l toml ./scripts/codemod.ts -v --strictness loose

# Validate workflow
npx codemod@latest workflow validate -w workflow.yaml
```

## References

- https://tokio.rs/blog/2025-01-01-announcing-axum-0-8-0
- https://docs.rs/crate/axum/0.8.8/source/CHANGELOG.md

## License

MIT
