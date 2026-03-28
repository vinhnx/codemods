# Migration Recipe Quality Gate

Use this gate before opening a release PR for any codemod.

## Scope and approval

- [ ] Target migration is pre-approved (framework/library/SDK and version range)
- [ ] Migration goal is deterministic and production-oriented
- [ ] Success criteria are documented in codemod README

## Deterministic automation target

- [ ] Codemod automates at least 80% of common migration patterns
- [ ] Patterns that are intentionally out of scope are listed explicitly
- [ ] No ambiguous rewrites are performed automatically

## Safety and regression controls

- [ ] Includes no-op fixtures for already-migrated code
- [ ] Includes non-target no-op fixtures to prevent false positives
- [ ] Includes edge-case fixtures for aliasing, grouped imports, and multiline patterns
- [ ] Rewrites are idempotent (second run should not produce additional changes)

## Test and validation requirements

- [ ] `npx codemod workflow validate -w codemods/<slug>/workflow.yaml` passes
- [ ] Rust fixture tests pass with strictness loose:
      `npx codemod jssg test -l rust ./scripts/codemod.ts -v --strictness loose`
- [ ] Dry-run baseline executed against at least one real target repository
- [ ] Dry-run outcome captured (changed files or no-op with rationale)

## Documentation requirements

- [ ] README includes: migration scope, what is automated, what is manual follow-up
- [ ] README includes run commands from source and registry
- [ ] Migration guide includes manual checklist for remaining 20% edge cases
- [ ] Registry/package metadata and keywords are accurate

## Release readiness

- [ ] Package version updated
- [ ] Release tag prepared in format `<codemod-name>@v<version>`
- [ ] Release checklist updated with package-specific test/validate/tag commands
- [ ] PR includes evidence links (test output, dry-run output, tag/commit references)

## Evidence block (copy into PR)

- Codemod slug:
- Version:
- Coverage claim (automated vs manual):
- Validation command output summary:
- Fixture test summary:
- Real-repo dry-run target(s):
- Risk notes:
- Follow-up tasks:
