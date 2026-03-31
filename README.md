# Codemods

A set of my [Codemod](https://docs.codemod.com) that help Rust projects adopt new library versions and handle breaking changes with less manual work.

## Available codemods

Open [Codemod registry](https://app.codemod.com/registry) and search for:

| Codemod                    | Migration                                                           | Registry                                                              |
| -------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `axum-0-7-to-0-8`          | `axum` v0.7 → v0.8 route path syntax (`/:param` → `/{param}`)       | [registry](https://app.codemod.com/registry/axum-0-7-to-0-8)          |
| `clap-v3-to-v4`            | `clap` v3 → v4 (derive, builder API, error-kind renames)            | [registry](https://app.codemod.com/registry/clap-v3-to-v4)            |
| `hyper-0-14-to-1-0`        | `hyper` v0.14 → v1.x (legacy client import/path rewrites)           | [registry](https://app.codemod.com/registry/hyper-0-14-to-1-0)        |
| `rand-0-8-to-0-9`          | `rand` v0.8 → v0.9 (`thread_rng` → `rng`, `gen*` → `random*`)       | [registry](https://app.codemod.com/registry/rand-0-8-to-0-9)          |
| `tree-sitter-0-24-to-0-25` | `tree-sitter` v0.24 → v0.25 (`child_containing_descendant` renames) | [registry](https://app.codemod.com/registry/tree-sitter-0-24-to-0-25) |
| `ratatui-0-24-to-0-30`    | `ratatui` v0.24–v0.30 (`Frame::size`→`area`, `Spans`→`Line`, etc.)  | [registry](https://app.codemod.com/registry/ratatui-0-24-to-0-30)    |

### Run from registry

```bash
bunx codemod <codemod-name> --target /path/to/rust/project
```

### Run from source

```bash
bunx codemod workflow run -w codemods/<slug>/workflow.yaml
```

By default, codemods run in the current folder. Add `--target /path/to/repo` to run elsewhere.

> [!CAUTION]
> Codemods modify code. Run them only on Git-tracked files, and commit or stash changes first.

## Case studies

- [VT Code: Full Dependency Migration](case-studies/vtcode-full-migration.md) — End-to-end migration across all codemods with use-case tables and reproduction steps.
- [VT Code: rand 0.8 to 0.9](case-studies/vtcode-rand-0.8-to-0.9.md) — Deterministic `rand` API rewrites reduce migration toil; distribution edge cases left for manual follow-up.
- [VT Code: tree-sitter 0.24 to 0.25](case-studies/vtcode-tree-sitter-0.24-to-0.25.md) — `child_containing_descendant` removal across all call forms.
- [VT Code: ratatui 0.24 to 0.30](case-studies/vtcode-ratatui-0-24-to-0-30.md) — TUI layer migration from ratatui 0.28/0.29 to 0.30.

## Repository layout

```
codemods/<slug>/
  workflow.yaml
  codemod.yaml
  package.json
  tsconfig.json
  scripts/
  tests/
  rules/
  agents/skill/<slug>/
    SKILL.md
    references/
  README.md
types/
  codemod-ast-grep.d.ts
case-studies/
.github/
  ISSUE_TEMPLATE/
  workflows/
```

Each codemod is self-contained so maintainers can validate and publish packages independently.

## Creating codemods

1. Scaffold: `bunx codemod init`
2. Implement Rust rewrites as AST-targeted `js-ast-grep` transforms; avoid whole-file string replacement for source migrations
3. Use [Codemod MCP](https://docs.codemod.com/model-context-protocol) when symbol definitions or cross-file references matter
4. Validate: `bunx codemod workflow validate -w codemods/<slug>/workflow.yaml`
5. Test: `bunx codemod jssg test -l rust ./scripts/codemod.ts -v --strictness loose`

## Maintainer

[Vinh Nguyen](https://vinhnx.github.io)

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add a new codemod, validate it, and prepare it for release. Open a tracking issue with the [quality gate template](.github/ISSUE_TEMPLATE/migration-recipe-quality-gate.yml) when you are ready.

## License

MIT. See [LICENSE](LICENSE).
