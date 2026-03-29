# Case Study: Migrating VT Code from rand 0.8 to 0.9

This write-up shows how the `rand-0-8-to-0-9` codemod fits into a real migration on [vinhnx/VT Code](https://github.com/vinhnx/VT Code), my own open-source coding agent written primarily in Rust.

I built and maintain VT Code as a real product, not as a migration demo repository. It has active releases, outside contributors, real users, and a broad feature surface: a CLI and TUI, tool execution, shell-safety controls, protocol integrations, OAuth flows, configuration layers, and a multi-crate Rust workspace. That makes it a good place to evaluate whether a codemod is useful in practice instead of only in synthetic fixtures.

## Project context

At the time of writing, VT Code is a public open-source coding agent with:

- roughly 465 GitHub stars
- roughly 40 forks
- active releases
- multiple external contributors

From the product side, VT Code is an LLM-native coding agent with robust shell safety, multi-provider support, skills support, and protocol integrations such as ACP, A2A, and Anthropic-compatible APIs. From the engineering side, it is a serious Rust codebase with auth flows, networked components, tests, tool orchestration, and multiple internal crates. That makes it a credible public case-study target rather than a private sandbox.

## Migration target

- Library: `rand`
- From: `0.8.x`
- To: `0.9.x`
- Codemod: `rand-0-8-to-0-9`

VT Code's public history includes a real dependency upgrade event in commit `bc5d5b121` (`chore(deps): bump the cargo-monthly-rollup group across 1 directory with 28 updates`), where the commit message explicitly includes `rand` moving from `0.8.5` to `0.9.2`.

## Why this case is useful

I like this case because it reflects the kind of migration I actually care about in my own projects:

- some API changes are deterministic and safe to automate
- some call sites still need manual follow-up
- the migration happened in a real public codebase, not a synthetic fixture

In VT Code, random-value generation is not buried in throwaway sample code. It appears in real support code such as test data generation and slug creation. Those utilities are small, but they are reused across the workspace, which makes them exactly the kind of places where repetitive API churn should be automated if possible.

That is exactly the boundary a production-grade codemod should make explicit.

## Representative before and after

The public VT Code history before the upgrade contained legacy `rand 0.8` patterns like this in `tests/mock_data.rs`:

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

The current VT Code tree shows the post-migration shape:

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

In VT Code, this code is not incidental. The `tests/mock_data.rs` helpers support broader testing workflows, and slug generation feeds human-readable identifiers used elsewhere in the project. That gives the migration a concrete project context instead of a contrived example.

## What the codemod automates well

The `rand-0-8-to-0-9` codemod deterministically handles the high-confidence API renames that appear in VT Code's migration surface:

- `rand::thread_rng()` -> `rand::rng()`
- `.gen_range(...)` -> `.random_range(...)`
- `.gen_bool(...)` -> `.random_bool(...)`
- `.gen_ratio(...)` -> `.random_ratio(...)`
- `.gen(...)` -> `.random(...)`
- `use rand::thread_rng;` -> `use rand::rng;`

These rewrites are the fast, repetitive parts of the migration and are exactly the sort of changes a codemod should take off a maintainer's plate.

For a project like VT Code, that matters because I would rather spend review time on agent behavior, shell safety, authentication, protocol compatibility, and UX stability than on repetitive crate-API churn.

## What still needs manual follow-up

VT Code's `random_string` example also shows why the migration is not 100% mechanical:

- `rand::distributions::Alphanumeric` moved to `rand::distr::Alphanumeric`
- the iteration style changed from `rng.sample(...)` to `sample_iter(...)`
- the migrated code benefits from an explicit `char::from` conversion

Those changes are real but less universal. They are better documented as manual follow-up steps than blindly rewritten everywhere.

That distinction matters in VT Code specifically. Because the repository spans runtime crates, auth flows, TUI code, protocol support, and testing infrastructure, an over-aggressive rewrite would be worse than a smaller codemod plus a clear manual checklist.

## Why this is still a strong codemod use case

This migration is valuable because the codemod can remove the predictable churn first, leaving maintainers with a smaller, clearer review surface for the few semantic adjustments that remain.

In practice, the workflow becomes:

1. Run the codemod to apply deterministic `rand` API renames.
2. Review the remaining distribution-related call sites manually.
3. Run the project's validation suite.

That is the workflow I want from a production-grade codemod in a real project I maintain: automate the rote API renames, then spend human attention on the smaller number of behavior-sensitive utilities.

## Suggested reproduction workflow

From this codemod repository:

```bash
cd codemods/rand-0.8-to-0.9
bunx codemod@latest workflow validate -w workflow.yaml
bunx codemod@latest jssg test -l rust ./scripts/codemod.ts -v --strictness loose
```

Against a target Rust project:

```bash
bunx codemod@latest run rand-0-8-to-0-9 --target /path/to/project
```

Then review remaining manual follow-up for distribution APIs and sampling helpers.

## Key takeaway

VT Code is a good public case study not because the migration was huge, but because it demonstrates the right split:

- codemod for deterministic API churn
- human review for the smaller semantic edge cases

For a real Rust product that I actively build and maintain, that is exactly the bar a production-grade migration recipe should hit.
