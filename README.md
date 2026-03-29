# Organization Codemods

Official codemods for your organization to help users adopt new features and handle breaking changes with less manual work.

Community contributions are welcome. Use this repository to create, validate, and publish codemods from a shared monorepo.

## One-time setup

1. Create this codemod repository in your organization.
2. Sign in to [Codemod](https://app.codemod.com) with your GitHub account.
3. Install the Codemod GitHub app for this repository so publishes can be associated with your organization.
4. Configure a [trusted publisher](https://docs.codemod.com) in Codemod so GitHub Actions can publish with OIDC.
5. Reserve an organization scope in Codemod before publishing so your packages stay grouped in the Codemod Registry.

Use [Codemod MCP](https://docs.codemod.com/model-context-protocol) and `npx codemod init` to create new codemods from this monorepo.

## Repository layout

Each codemod lives under `codemods/<slug>/`.

```text
codemods/<slug>/
  workflow.yaml
  codemod.yaml
  scripts/
  tests/
```

Keep each codemod self-contained so maintainers can validate and publish packages independently.

## Available codemods

Open [Codemod registry](https://app.codemod.com/registry), and search for 

- `axum-0-7-to-0-8`: Migrate Rust `axum` route path syntax from v0.7 to v0.8 (`/:param` to `/{param}` and `/*rest` to `/{*rest}`), plus common `Cargo.toml` dependency bump patterns. Registry: https://app.codemod.com/registry/axum-0-7-to-0-8
- `clap-v3-to-v4`: Migrate Rust `clap` usage from v3 to v4 (derive, builder API, error-kind renames, and common `Cargo.toml` dependency bump patterns). Registry: https://app.codemod.com/registry/clap-v3-to-v4
- `hyper-0-14-to-1-0`: Migrate Rust `hyper` from v0.14 to v1.x with deterministic legacy client import/path rewrites. Registry: pending publish
- `rand-0-8-to-0-9`: Migrate Rust `rand` usage from v0.8 to v0.9 (`thread_rng` to `rng`, `gen*` to `random*`, and common `Cargo.toml` dependency bump patterns). Registry: https://app.codemod.com/registry/rand-0-8-to-0-9
- `tree-sitter-0-24-to-0-25`: Migrate Rust `tree-sitter` usage from v0.24 to v0.25 — renames `child_containing_descendant` across all call forms (Rust method, UFCS, C FFI), plus `Cargo.toml` dependency bump. Registry: pending publish

Run from registry:

```bash
npx codemod run axum-0-7-to-0-8 --target /path/to/rust/project
npx codemod run clap-v3-to-v4 --target /path/to/rust/project
npx codemod run hyper-0-14-to-1-0 --target /path/to/rust/project
npx codemod run rand-0-8-to-0-9 --target /path/to/rust/project
npx codemod run tree-sitter-0-24-to-0-25 --target /path/to/rust/project
```

## Creating codemods

- Scaffold new codemods with `npx codemod init`.
- Use Codemod MCP when creating or refining codemods, especially when symbol definitions or cross-file references matter.
- Validate package workflows with `npx codemod workflow validate -w codemods/<slug>/workflow.yaml`.
- Run package tests from the codemod directory before publishing.

Example validation + tests for one package:

```bash
cd codemods/<slug>
npx codemod workflow validate -w workflow.yaml
npx codemod jssg test -l rust ./scripts/codemod.ts -v --strictness loose
```

## Running codemods

> [!CAUTION]
> Codemods modify code. Run them only on Git-tracked files, and commit or stash changes first.

### From the registry

```bash
npx codemod <codemod-name>
```

### From source

```bash
npx codemod workflow run -w codemods/<slug>/workflow.yaml
```

By default, codemods run in the current folder. Add `--target /path/to/repo` to run elsewhere.

## Case studies

- [VTCode: rand 0.8 to 0.9](case-studies/vtcode-rand-0.8-to-0.9.md) - Public OSS case study showing how deterministic `rand` API rewrites reduce migration toil while leaving distribution-related edge cases for manual follow-up.
- [VTCode: tree-sitter 0.24 to 0.25](case-studies/vtcode-tree-sitter-0.24-to-0.25.md) - Case study demonstrating tree-sitter API migration with removed C API function renames and manual follow-up for deprecated Rust bindings.

## Author note

Built and maintained by Vinh Nguyen. Contributions and improvements are welcome through pull requests.

## License

This repository is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Publishing and contribution guidance

- Use the generated GitHub Actions workflow to publish after review and merge.
- Use [CONTRIBUTION_QUALITY_GATE.md](CONTRIBUTION_QUALITY_GATE.md) as the minimum readiness checklist for production-grade migration recipes.
- Use [MONTHLY_UPDATE_TEMPLATE.md](MONTHLY_UPDATE_TEMPLATE.md) when preparing monthly deliverable summaries.
- Open a tracking issue with the [Migration Recipe Quality Gate template](.github/ISSUE_TEMPLATE/migration-recipe-quality-gate.yml).
- See the [Codemod docs](https://go.codemod.com/docs) for CLI and publishing details.
