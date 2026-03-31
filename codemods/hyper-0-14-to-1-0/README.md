# hyper-0-14-to-1-0

Automate deterministic parts of the Rust [hyper](https://github.com/hyperium/hyper) migration from v0.14 to v1.x for legacy client usage.

## What it does

### Rust source updates

- Rewrites legacy client imports:
    - `use hyper::Client;` -> `use hyper_util::client::legacy::Client;`
    - `use hyper::client::HttpConnector;` -> `use hyper_util::client::legacy::connect::HttpConnector;`
    - `use hyper::client::connect::HttpConnector;` -> `use hyper_util::client::legacy::connect::HttpConnector;`
- Rewrites grouped imports:
    - `use hyper::{Body, Client};` -> split into `use hyper::{Body};` and `use hyper_util::client::legacy::Client;`
- Rewrites fully-qualified type paths in code:
    - `hyper::Client` -> `hyper_util::client::legacy::Client`
    - `hyper::client::HttpConnector` -> `hyper_util::client::legacy::connect::HttpConnector`

## Usage

```bash
# Validate the workflow
bunx codemod@latest workflow validate -w workflow.yaml

# Dry run against your project
bunx codemod@latest workflow run -w workflow.yaml --target /path/to/your/rust/project

# Run the package from the registry
bunx codemod@latest hyper-0-14-to-1-0 --target /path/to/your/rust/project
```

## Manual follow-up

After running, you should:

1. Update `Cargo.toml` to Hyper 1 and add `hyper-util` with required features for your runtime/protocol usage
2. Review client construction sites and switch to the Hyper v1 builder APIs where needed
3. Migrate body handling (`to_bytes`, body types, and response collection) as needed for your codebase
4. Run `cargo check` and `cargo test`

## Development

```bash
# Run tests
bunx codemod@latest jssg test -l rust ./scripts/codemod.ts -v --strictness loose

# Validate workflow
bunx codemod@latest workflow validate -w workflow.yaml
```

## References

- https://hyper.rs/guides/1/upgrading/
- https://docs.rs/hyper/latest/hyper/
- https://docs.rs/hyper-util/latest/hyper_util/

## License

MIT
