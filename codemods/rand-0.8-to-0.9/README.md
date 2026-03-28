# rand-0-8-to-0-9

Automate the deterministic Rust [rand](https://github.com/rust-random/rand) migration from v0.8 to v0.9 for the most common API renames.

## What it does

### RNG constructor updates

- `rand::thread_rng()` -> `rand::rng()`
- `thread_rng()` -> `rng()` when imported from `rand`
- `use rand::thread_rng;` -> `use rand::rng;`
- `use rand::{..., thread_rng, ...};` -> `use rand::{..., rng, ...};`
- Supports aliased imports (`thread_rng as foo` -> `rng as foo`)

### Method renames

- `.gen(...)` -> `.random(...)`
- `.gen_range(...)` -> `.random_range(...)`
- `.gen_bool(...)` -> `.random_bool(...)`
- `.gen_ratio(...)` -> `.random_ratio(...)`
- `Rng::gen(...)` -> `Rng::random(...)`
- `Rng::gen_range(...)` -> `Rng::random_range(...)`
- `Rng::gen_bool(...)` -> `Rng::random_bool(...)`
- `Rng::gen_ratio(...)` -> `Rng::random_ratio(...)`

## Usage

```bash
# Validate the workflow
npx codemod@latest workflow validate -w workflow.yaml

# Dry run against your project
npx codemod@latest workflow run -w workflow.yaml --target /path/to/your/rust/project

# Run the package from the registry
npx codemod@latest run rand-0-8-to-0-9 --target /path/to/your/rust/project
```

## Manual follow-up

After running, you should:

1. Update `Cargo.toml` to `rand = "0.9"`
2. Run `cargo check` and `cargo test`
3. Review call sites using custom RNG traits or methods named similarly to `gen`
4. Handle deprecations outside this codemod's deterministic rename scope

## Development

```bash
# Run tests
npx codemod@latest jssg test -l rust ./scripts/codemod.ts -v --strictness loose

# Validate workflow
npx codemod@latest workflow validate -w workflow.yaml
```

## References

- https://rust-random.github.io/book/update-0.9.html
- https://github.com/rust-random/rand/releases

## License

MIT
