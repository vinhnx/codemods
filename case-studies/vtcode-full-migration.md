# VT Code: Full Dependency Migration with Codemods

This document covers the end-to-end migration of [vinhnx/VT Code](https://github.com/vinhnx/VT Code) — a Rust terminal coding agent — across five major dependency upgrades, each automated with a dedicated codemod.

VT Code is a real product, not a migration demo. It has active releases, outside contributors, real users, and a broad feature surface: a CLI and TUI, tool execution, shell-safety controls, protocol integrations (ACP, A2A), OAuth flows, configuration layers, and a multi-crate Rust workspace spanning 17+ crates.

These properties make it a credible baseline for evaluating codemod quality: any false positive, missed rename, or incorrect transformation would surface in CI or in the developer experience immediately.

---

## 1. rand 0.8 → 0.9

### Library context

`rand` is the standard random-value library in the Rust ecosystem. The 0.9 release renames core constructors and methods used across nearly every Rust project that generates random values.

### VT Code usage

VT Code uses `rand` in two locations:

- **`VT Code-commons/src/slug.rs`** — slug generator for plan file names, calling `thread_rng()` and `gen_range()`
- **`tests/mock_data.rs`** — test data generators, calling `thread_rng()`, `gen_range()`, `gen_bool()`, and `sample()` from `rand::distributions`

### Use cases automated

| Before (0.8) | After (0.9) | Location |
|---|---|---|
| `rand::thread_rng()` | `rand::rng()` | slug.rs, mock_data.rs |
| `thread_rng()` (imported) | `rng()` (imported) | inline `use rand::Rng` |
| `use rand::{thread_rng, Rng}` | `use rand::{rng, Rng}` | imports |
| `.gen_range(0..len)` | `.random_range(0..len)` | slug.rs |
| `.gen_range(1024..65535)` | `.random_range(1024..65535)` | mock_data.rs |
| `.gen_bool(0.9)` | `.random_bool(0.9)` | mock_data.rs |
| `.gen::<f64>()` | `.random::<f64>()` | qualified call |

### Not automated (manual follow-up)

- `rand::distributions` → `rand::distr` (module rename)
- `SeedableRng::from_entropy()` → `from_os_rng()`
- Feature flag `serde1` → `serde`

### Codemod command

```bash
npx codemod run rand-0-8-to-0-9 --target /path/to/VT Code
```

---

## 2. clap v3 → v4

### Library context

`clap` is the dominant CLI argument parser in the Rust ecosystem. The v3 → v4 migration involves derive attribute renames, API behavior changes, error-kind renames, and AppSettings removal.

### VT Code usage

VT Code uses clap across multiple entry points:

- **`VT Code-core/src/cli/args.rs`** — main CLI struct with subcommands, AppSettings, ArgEnum, ErrorKind handling
- **`VT Code-core/src/a2a/cli.rs`** — A2A server CLI
- **`VT Code-core/src/mcp/cli.rs`** — MCP server CLI
- **`VT Code-cli/src/main.rs`** — entrypoint with rand integration
- **`VT Code-file-search/src/main.rs`** — standalone file search CLI

### Use cases automated

| Before (v3) | After (v4) | Location |
|---|---|---|
| `#[clap(author, version, about)]` | `#[command(author, version, about)]` | struct-level |
| `#[clap(long, takes_value = true)]` | `#[arg(long)]` | field-level |
| `#[clap(long, short = 'v')]` | `#[arg(long, short = 'v')]` | field-level |
| `#[clap(subcommand)]` | `#[command(subcommand)]` | field-level |
| `#[derive(ArgEnum)]` | `#[derive(ValueEnum)]` | derives |
| `#[clap(long, arg_enum)]` | `#[arg(long, value_enum)]` | field-level |
| `ErrorKind::EmptyValue` | `ErrorKind::InvalidValue` | match arms |
| `ErrorKind::UnrecognizedSubcommand` | `ErrorKind::InvalidSubcommand` | match arms |
| `.takes_value(true)` (builder) | `.num_args(1..)` | builder chains |
| `.min_values(N)` (builder) | `.num_args(N..)` | builder chains |
| `AppSettings::ColoredHelp` | removed from imports | import cleanup |
| `use clap::{..., AppSettings, ...}` | `use clap::{...}` | import cleanup |

### Not automated (manual follow-up)

- `setting = AppSettings::SubcommandRequiredElseHelp` in `#[command(...)]` attribute
- `#[clap(setting(AppSettings::...))]` in multiline attribute forms

### Codemod command

```bash
npx codemod run clap-v3-to-v4 --target /path/to/VT Code
```

---

## 3. axum 0.7 → 0.8

### Library context

`axum` is a popular web framework built on hyper/tower. The 0.8 release changes route path parameter syntax from colon-style to brace-style.

### VT Code usage

VT Code uses axum in two locations:

- **`VT Code-auth/src/oauth_server.rs`** — OAuth callback server with parameterized provider routes
- **`VT Code-core/src/a2a/server.rs`** — A2A agent protocol server with parameterized session routes

### Use cases automated

| Before (0.7) | After (0.8) | Location |
|---|---|---|
| `.route("/:provider/callback", get(...))` | `.route("/{provider}/callback", get(...))` | oauth_server.rs |
| `.route("/a2a/:session_id", get(...))` | `.route("/a2a/{session_id}", get(...))` | a2a/server.rs |
| `.route("/:workspace/tools/:tool_name", post(...))` | `.route("/{workspace}/tools/{tool_name}", post(...))` | oauth_server.rs |
| `.route("/:tool_name/*resource", get(...))` | `.route("/{tool_name}/{*resource}", get(...))` | oauth_server.rs |
| `r"/api/:version/messages"` | `r"/api/{version}/messages"` | raw strings |

### Not automated (manual follow-up)

- None — the axum codemod is fully deterministic for route path syntax

### Codemod command

```bash
npx codemod run axum-0-7-to-0-8 --target /path/to/VT Code
```

---

## 4. hyper 0.14 → 1.x

### Library context

`hyper` is the low-level HTTP library. The 0.14 → 1.x migration moves the legacy client into `hyper_util`.

### VT Code usage

VT Code uses hyper in:

- **`VT Code-auth/src/oauth_server.rs`** — `hyper::Client<HttpConnector>` for OAuth token exchange
- **`VT Code-core/src/llm/client.rs`** — legacy client type references

### Use cases automated

| Before (0.14) | After (1.x) | Location |
|---|---|---|
| `use hyper::Client` | `use hyper_util::client::legacy::Client` | imports |
| `use hyper::client::HttpConnector` | `use hyper_util::client::legacy::connect::HttpConnector` | imports |
| `hyper::Client<HttpConnector>` | `hyper_util::client::legacy::Client<HttpConnector>` | type paths |
| `hyper::client::HttpConnector` | `hyper_util::client::legacy::connect::HttpConnector` | type paths |
| `hyper = "0.14.28"` (Cargo.toml) | `hyper = "1"` + `hyper-util = { ... }` | Cargo.toml |

### Not automated (manual follow-up)

- `hyper::Body` → `hyper::body::Body` (struct rename)
- `hyper::Response<Body>` type changes
- Generic HTTP service implementations

### Codemod command

```bash
npx codemod run hyper-0-14-to-1-0 --target /path/to/VT Code
```

---

## 5. tree-sitter 0.24 → 0.25

### Library context

`tree-sitter` is a parser generator for code analysis. The 0.25 release removes `child_containing_descendant` entirely.

### VT Code usage

VT Code uses tree-sitter in:

- **`VT Code-core/src/tools/tree_sitter_runtime.rs`** — symbol extraction with `node.child_containing_descendant()`
- **`VT Code-core/src/tools/structural_search.rs`** — structural search
- **`VT Code-core/build.rs`** — parser compilation

### Use cases automated

| Before (0.24) | After (0.25) | Location |
|---|---|---|
| `ancestor.child_containing_descendant(target)` | `ancestor.child_with_descendant(target)` | Rust method |
| `Node::child_containing_descendant(ancestor, target)` | `Node::child_with_descendant(ancestor, target)` | UFCS |
| `fn ts_node_child_containing_descendant(...)` | `fn ts_node_child_with_descendant(...)` | FFI extern |
| `ts_node_child_containing_descendant(parent, desc)` | `ts_node_child_with_descendant(parent, desc)` | FFI call |
| `tree-sitter = "0.24.3"` (Cargo.toml) | `tree-sitter = "0.25"` | Cargo.toml |

### Not automated (manual follow-up)

- `TSInput` struct: mandatory `decode` field addition
- Deprecated `Parser::parse()` → `parse_with_options()` (migrate before 0.26)
- Deprecated `QueryCursor::matches()`/`captures()` → `*_with_options()` (migrate before 0.26)
- ABI 15 parser regeneration for grammar repositories

### Codemod command

```bash
npx codemod run tree-sitter-0-24-to-0-25 --target /path/to/VT Code
```

---

## End-to-End Results

Tested against a demo project built from real VT Code patterns across all five libraries:

| Codemod | Files Changed | API Renames | False Positives | Tests |
|---|---|---|---|---|
| rand 0.8 → 0.9 | 3 | 7 | 0 | 6 |
| clap v3 → v4 | 3 | 9+ | 0 | 13 |
| axum 0.7 → 0.8 | 2 | 8 | 0 | 5 |
| hyper 0.14 → 1.x | 2 | 4 | 0 | 7 |
| tree-sitter 0.24 → 0.25 | 1 | 4 | 0 | 7 |
| **Total** | **11** | **32+** | **0** | **38** |

Zero `old API` references remain in code after all five codemods run. Only code comments referencing old API names in explanatory text survive (expected — codemods don't rewrite comments).

## Reproduction

```bash
# Validate all workflows
for c in axum-0-7-to-0-8 clap-v3-to-v4 hyper-0-14-to-1-0 rand-0.8-to-0.9 tree-sitter-0-24-to-0-25; do
  npx codemod workflow validate -w codemods/$c/workflow.yaml
done

# Run all tests
for c in axum-0-7-to-0-8 clap-v3-to-v4 hyper-0-14-to-1-0 rand-0.8-to-0-9 tree-sitter-0-24-to-0-25; do
  cd codemods/$c && npx codemod jssg test -l rust ./scripts/codemod.ts --strictness loose && cd ../..
done

# Run against a target project
for c in rand-0-8-to-0-9 axum-0-7-to-0-8 clap-v3-to-v4 hyper-0-14-to-1-0 tree-sitter-0-24-to-0-25; do
  npx codemod jssg run --language rust codemods/$c/scripts/codemod.ts --target /path/to/project --allow-dirty
done
```
