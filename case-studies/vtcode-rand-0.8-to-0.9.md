# Case Study: Migrating VTCode from rand 0.8 to 0.9

This write-up shows how the `rand-0-8-to-0-9` codemod fits into a real migration on [vinhnx/VTCode](https://github.com/vinhnx/VTCode), a public Rust project with active releases, external contributors, and broad public usage.

## Project context

At the time of writing, VTCode is a public open-source coding agent with:

- roughly 465 GitHub stars
- roughly 40 forks
- active releases
- multiple external contributors

That makes it a credible public case-study target rather than a private sandbox.

## Migration target

- Library: `rand`
- From: `0.8.x`
- To: `0.9.x`
- Codemod: `rand-0-8-to-0-9`

VTCode's public history includes a real dependency upgrade event in commit `bc5d5b121` (`chore(deps): bump the cargo-monthly-rollup group across 1 directory with 28 updates`), where the commit message explicitly includes `rand` moving from `0.8.5` to `0.9.2`.

## Why this case is useful

VTCode is a good example of a migration that is not fully mechanical:

- some API changes are deterministic and safe to automate
- some call sites still need manual follow-up
- the migration happened in a real public codebase, not a synthetic fixture

That is exactly the kind of boundary a production-grade codemod should make explicit.

## Representative before and after

The public VTCode history before the upgrade contained legacy `rand 0.8` patterns like this in `tests/mock_data.rs`:

```rust
pub fn random_string(length: usize) -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    (0..length)
        .map(|_| rng.sample(rand::distributions::Alphanumeric) as char)
        .collect()
}

pub fn random_port() -> u16 {
    use rand::Rng;
    rand::thread_rng().gen_range(1024..65535)
}
```

The current VTCode tree shows the post-migration shape:

```rust
pub fn random_string(length: usize) -> String {
    use rand::{Rng, distr::Alphanumeric};

    let mut rng = rand::rng();
    (&mut rng)
        .sample_iter(&Alphanumeric)
        .take(length)
        .map(char::from)
        .collect()
}

pub fn random_port() -> u16 {
    use rand::Rng;

    rand::rng().random_range(1024..65535)
}
```

## What the codemod automates well

The `rand-0-8-to-0-9` codemod deterministically handles the high-confidence API renames that appear in VTCode's migration surface:

- `rand::thread_rng()` -> `rand::rng()`
- `.gen_range(...)` -> `.random_range(...)`
- `.gen_bool(...)` -> `.random_bool(...)`
- `.gen_ratio(...)` -> `.random_ratio(...)`
- `.gen(...)` -> `.random(...)`
- `use rand::thread_rng;` -> `use rand::rng;`

These rewrites are the fast, repetitive parts of the migration and are exactly the sort of changes a codemod should take off a maintainer's plate.

## What still needs manual follow-up

VTCode's `random_string` example also shows why the migration is not 100% mechanical:

- `rand::distributions::Alphanumeric` moved to `rand::distr::Alphanumeric`
- the iteration style changed from `rng.sample(...)` to `sample_iter(...)`
- the migrated code benefits from an explicit `char::from` conversion

Those changes are real but less universal. They are better documented as manual follow-up steps than blindly rewritten everywhere.

## Why this is still a strong codemod use case

This migration is valuable because the codemod can remove the predictable churn first, leaving maintainers with a smaller, clearer review surface for the few semantic adjustments that remain.

In practice, the workflow becomes:

1. Run the codemod to apply deterministic `rand` API renames.
2. Review the remaining distribution-related call sites manually.
3. Run the project's validation suite.

That is a realistic, production-facing migration story.

## Suggested reproduction workflow

From this codemod repository:

```bash
cd codemods/rand-0.8-to-0.9
npx codemod@latest workflow validate -w workflow.yaml
npx codemod@latest jssg test -l rust ./scripts/codemod.ts -v --strictness loose
```

Against a target Rust project:

```bash
npx codemod@latest run rand-0-8-to-0-9 --target /path/to/project
```

Then review remaining manual follow-up for distribution APIs and sampling helpers.

## Key takeaway

VTCode is a good public case study not because the migration was huge, but because it demonstrates the right split:

- codemod for deterministic API churn
- human review for the smaller semantic edge cases

That is the bar a production-grade migration recipe should hit.
