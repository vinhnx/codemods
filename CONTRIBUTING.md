# Contributing

Thanks for your interest in contributing to this codemod monorepo. This guide covers how to add a new codemod, validate it, and prepare it for release.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Bun](https://bun.sh/) (used for workspace management)
- [Codemod CLI](https://docs.codemod.com): `npm i -g codemod` or use `npx codemod@latest`

Install workspace dependencies from the repo root:

```bash
bun install
```

## Repository structure

```
codemods/<slug>/
  workflow.yaml         # Codemod workflow definition
  codemod.yaml          # Registry metadata (name, version, description, keywords)
  package.json          # Package config and scripts
  tsconfig.json         # TypeScript config
  scripts/              # Codemod implementation (codemod.ts)
  tests/                # Fixture tests (expected/ pairs)
  rules/                # AST-grep rule files (if applicable)
  agents/skill/<slug>/  # Skill definition for Codemod MCP
    SKILL.md
    references/
  README.md             # Codemod-specific documentation
types/
  codemod-ast-grep.d.ts # Type definitions for ast-grep module
case-studies/           # Real-world migration case studies
.github/
  ISSUE_TEMPLATE/       # Quality gate issue template
  workflows/            # CI/CD (publish.yml)
```

## Adding a new codemod

### 1. Scaffold the codemod

```bash
npx codemod init
```

This creates the directory under `codemods/<slug>/` with the standard layout.

### 2. Define the workflow

Edit `workflow.yaml` to describe the migration steps. Each codemod is self-contained so it can be validated and published independently.

### 3. Implement the codemod

Write the transformation logic in `scripts/codemod.ts`. Use [Codemod MCP](https://docs.codemod.com/model-context-protocol) when symbol definitions or cross-file references matter.

### 4. Add test fixtures

Place test fixtures in `tests/`. Each test case should have:

- `<name>.rs` — input file
- `<name>.expected.rs` — expected output after transformation

Include:

- **No-op fixtures**: code already migrated (should produce no changes)
- **Non-target fixtures**: code that looks similar but uses unrelated types (should not be rewritten)
- **Edge-case fixtures**: aliases, grouped imports, multiline patterns

### 5. Validate

```bash
cd codemods/<slug>
npx codemod@latest workflow validate -w workflow.yaml
npx codemod@latest jssg test -l rust ./scripts/codemod.ts -v --strictness loose
```

### 6. Write the codemod README

Your `README.md` should cover:

- What the codemod automates and what it does not
- Before/after examples
- Run commands (from source and from registry)
- Manual follow-up checklist for remaining edge cases
- References to upstream migration guides

### 7. Update root documentation

When adding a new codemod, also update:

- **README.md** — add to "Available codemods" and run commands
- **RELEASE_CHECKLIST.md** — add version, test, validate, and tag entries

## Quality gate

Before opening a release PR, your codemod must pass the [Migration Recipe Quality Gate](CONTRIBUTION_QUALITY_GATE.md). Open a tracking issue using the [quality gate template](.github/ISSUE_TEMPLATE/migration-recipe-quality-gate.yml).

Key requirements:

- Automates at least 80% of common deterministic migration patterns
- No-op and non-target fixtures included
- Rewrites are idempotent
- Workflow validation and fixture tests pass
- Real-repo dry-run baseline recorded

See [CONTRIBUTION_QUALITY_GATE.md](CONTRIBUTION_QUALITY_GATE.md) for the full checklist.

## Releasing

1. Update the version in `codemod.yaml` and `package.json`.
2. Run all validations and tests (see [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)).
3. Create a git tag: `git tag <codemod-slug>@v<version>`
4. Push the tag to trigger the publish workflow: `git push origin <codemod-slug>@v<version>`
5. Verify the package appears in the [Codemod Registry](https://app.codemod.com/registry).

## Case studies

If you use a codemod to migrate a real project, consider adding a case study under `case-studies/`. A good case study covers:

- The project and its migration context
- What the codemod automated vs what needed manual follow-up
- Metrics (files changed, coverage, false positives)
- A suggested reproduction workflow

## Getting help

- [Codemod docs](https://go.codemod.com/docs)
- [Codemod MCP](https://docs.codemod.com/model-context-protocol)
- Open an issue using the [quality gate template](.github/ISSUE_TEMPLATE/migration-recipe-quality-gate.yml)

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
