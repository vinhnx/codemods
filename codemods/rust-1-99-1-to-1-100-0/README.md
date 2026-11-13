# Rust 1.99.1 to 1.100.0

This codemod upgrades exact `1.99.1` values in `[toolchain].channel` of `rust-toolchain.toml`, `[package].rust-version` and `[workspace.package].rust-version` of `Cargo.toml`, and root `msrv` in `clippy.toml`. Other versions, inherited workspace values, package metadata, and quoted keys are left unchanged. File selection excludes target, vendor, tests, and fixtures directories. It also simplifies function-body terminal `if condition { return true; } false` guards diagnosed by Clippy 1.100. Nested blocks, macros, let conditions, comments and attributes in the matched guard are left unchanged.

Review the diff; this is a partial migration. Update CI workflows, images and their digests, devcontainers, documentation, auxiliary toolchains such as Hawk, and other pins manually. Check compiler compatibility, run `cargo fmt`, locked Clippy, and your tests. Cargo 1.100 changes intermediate artifact layout: tools should consume Cargo JSON messages and integration-test binary environment variables instead of inferring intermediate paths. See the [Rust release notes](https://doc.rust-lang.org/stable/releases.html#version-11000-2026-11-12).

```sh
npx codemod@latest workflow validate -w workflow.yaml
npx codemod@latest workflow run -w workflow.yaml --target /path/to/project --dry-run
npx codemod@latest workflow run -w workflow.yaml --target /path/to/project
npm test
```
