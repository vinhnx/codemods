# Codemod Release Checklist

## Validated packages

1. clap-v3-to-v4@1.0.4
2. rand-0-8-to-0-9@1.0.1
3. axum-0-7-to-0-8@1.0.1

## Pre-release checks

1. Ensure all tests pass for each package:

```bash
cd codemods/clap-v3-to-v4 && npx codemod@latest jssg test -l rust ./scripts/codemod.ts -v --strictness loose
cd codemods/rand-0.8-to-0.9 && npx codemod@latest jssg test -l rust ./scripts/codemod.ts -v --strictness loose
cd codemods/axum-0-7-to-0-8 && npx codemod@latest jssg test -l rust ./scripts/codemod.ts -v --strictness loose
```

2. Ensure all workflows validate:

```bash
cd codemods/clap-v3-to-v4 && npx codemod@latest workflow validate -w workflow.yaml
cd codemods/rand-0.8-to-0.9 && npx codemod@latest workflow validate -w workflow.yaml
cd codemods/axum-0-7-to-0-8 && npx codemod@latest workflow validate -w workflow.yaml
```

## Git tags for publish

Create and push tags from repo root:

```bash
git tag clap-v3-to-v4@v1.0.4
git tag rand-0-8-to-0-9@v1.0.1
git tag axum-0-7-to-0-8@v1.0.1

git push origin clap-v3-to-v4@v1.0.4
git push origin rand-0-8-to-0-9@v1.0.1
git push origin axum-0-7-to-0-8@v1.0.1
```

## Optional local publish check

Run from each codemod directory if you want to verify local publish command behavior:

```bash
bunx codemod publish
```

## Post-publish updates

1. Replace pending axum registry link in README with the final URL.
2. Announce release notes with migration scope for each package.
3. Start case study draft using axum route syntax migration examples.
