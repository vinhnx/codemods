# VT Code: Full Dependency Migration with Codemods

This document covers the end-to-end migration of [vinhnx/VT Code](https://github.com/vinhnx/VTCode) — a Rust terminal coding agent — across six major dependency upgrades, each automated with a dedicated codemod.

VT Code is a real product, not a migration demo. It has active releases, outside contributors, real users, and a broad feature surface: a CLI and TUI, tool execution, shell-safety controls, protocol integrations (ACP, A2A), OAuth flows, configuration layers, and a multi-crate Rust workspace spanning 17+ crates.

These properties make it a credible baseline for evaluating codemod quality: any false positive, missed rename, or incorrect transformation would surface in CI or in the developer experience immediately.

---

## 1. rand 0.8 → 0.9

### Library context

`rand` is the standard random-value library in the Rust ecosystem. The 0.9 release renames core constructors and methods used across nearly every Rust project that generates random values.

### VT Code usage

VT Code uses `rand` in two locations:

- **`vtcode-commons/src/slug.rs`** — slug generator for plan file names, calling `thread_rng()` and `gen_range()`
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
bunx codemod@latest run rand-0-8-to-0-9 --target /path/to/vtcode
```

---

## 2. clap v3 → v4

### Library context

`clap` is the dominant CLI argument parser in the Rust ecosystem. The v3 → v4 migration involves derive attribute renames, API behavior changes, error-kind renames, and AppSettings removal.

### VT Code usage

VT Code uses clap across multiple entry points:

- **`vtcode-core/src/cli/args.rs`** — main CLI struct with subcommands, AppSettings, ArgEnum, ErrorKind handling
- **`vtcode-core/src/a2a/cli.rs`** — A2A server CLI
- **`vtcode-core/src/mcp/cli.rs`** — MCP server CLI
- **`vtcode-cli/src/main.rs`** — entrypoint with rand integration
- **`vtcode-file-search/src/main.rs`** — standalone file search CLI

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
bunx codemod@latest run clap-v3-to-v4 --target /path/to/vtcode
```

---

## 3. axum 0.7 → 0.8

### Library context

`axum` is a popular web framework built on hyper/tower. The 0.8 release changes route path parameter syntax from colon-style to brace-style.

### VT Code usage

VT Code uses axum in two locations:

- **`vtcode-auth/src/oauth_server.rs`** — OAuth callback server with parameterized provider routes
- **`vtcode-core/src/a2a/server.rs`** — A2A agent protocol server with parameterized session routes

### Use cases automated

| Before (0.7) | After (0.8) | Location |
|---|---|---|
| `.route("/:provider/callback", get(...))` | `.route("/{provider}/callback", get(...))` | oauth_server.rs |
| `.route("/a2a/:session_id", get(...))` | `.route("/a2a/{session_id}", get(...))` | a2a/server.rs |
| `.route("/:workspace/tools/:tool_name", post(...))` | `.route("/{workspace}/tools/{tool_name}", post(...))` | oauth_server.rs |
| `.route("/:tool_name/*resource", get(...))` | `.route("/{tool_name}/{*resource}", get(...))` | oauth_server.rs |
| `r"/api/:version/messages"` | `r"/api/{version}/messages"` | raw strings |

### Not automated (manual follow-up)

- Route strings stored in variables or constants
- Handler signature changes
- Middleware API changes

### Codemod command

```bash
bunx codemod@latest run axum-0-7-to-0-8 --target /path/to/vtcode
```

---

## 4. hyper 0.14 → 1.x

### Library context

`hyper` is the low-level HTTP library. The 0.14 → 1.x migration moves the legacy client into `hyper_util`.

### VT Code usage

VT Code uses hyper in:

- **`vtcode-auth/src/oauth_server.rs`** — `hyper::Client<HttpConnector>` for OAuth token exchange
- **`vtcode-core/src/llm/client.rs`** — legacy client type references

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
bunx codemod@latest run hyper-0-14-to-1-0 --target /path/to/vtcode
```

---

## 5. tree-sitter 0.24 → 0.25

### Library context

`tree-sitter` is a parser generator for code analysis. The 0.25 release removes `child_containing_descendant` entirely.

### VT Code usage

VT Code uses tree-sitter in:

- **`vtcode-core/src/tools/tree_sitter_runtime.rs`** — symbol extraction with `node.child_containing_descendant()`
- **`vtcode-core/src/tools/structural_search.rs`** — structural search
- **`vtcode-core/build.rs`** — parser compilation

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
bunx codemod@latest run tree-sitter-0-24-to-0-25 --target /path/to/vtcode
```

---

## 6. ratatui 0.28/0.29 → 0.30

### Library context

`ratatui` is the most widely used Rust TUI library. The 0.24–0.30 migration series accumulated significant API churn: module restructuring, type renames, method signature changes, and removal of deprecated types.

### VT Code usage

VT Code's TUI layer spans the core presentation crate. Key patterns hit by the migration:

- **`vtcode-tui/src/ui.rs`** — frame drawing using `Frame::size()`, `block::Title`, `Spans`, `Margin`, `Buffer::filled`
- **`vtcode-tui/src/widgets/table.rs`** — Table with `highlight_style`
- **`vtcode-tui/src/widgets/list.rs`** — List with `highlight_style` (preserved)
- **`vtcode-tui/src/app.rs`** — terminal event loop

### Use cases automated

| Before | After | Version |
|---|---|---|
| `use ratatui::terminal::{Frame, Terminal}` | `use ratatui::{Frame, Terminal}` | v0.28 |
| `frame.size()` | `frame.area()` | v0.28 |
| `terminal.size()` | `terminal.area()` | v0.28 |
| `Spans::from(...)` | `Line::from(...)` | v0.24 |
| `use ratatui::widgets::block::{Title, Position}` | `use ratatui::widgets::TitlePosition` | v0.30 |
| `Title::from("...")` | `Line::from("...")` | v0.30 |
| `Position::Bottom` | `TitlePosition::Bottom` | v0.30 |
| `.title_on_bottom()` | `.title_bottom()` | v0.27 |
| `Table::highlight_style(...)` | `Table::row_highlight_style(...)` | v0.29 |
| `List::highlight_style(...)` | `List::highlight_style(...)` (preserved) | — |
| `.inner(&Margin {...})` | `.inner(Margin {...})` | v0.27 |
| `Buffer::filled(area, &Cell::new(...))` | `Buffer::filled(area, Cell::new(...))` | v0.27 |
| `BorderType::line_symbols(...)` | `BorderType::border_symbols(...)` | v0.24 |
| `symbols::line::Set` | `symbols::border::Set` | v0.24 |
| `scrollbar::{Scrollbar, Set}` | split into widget/symbols imports | v0.23 |
| `.track_symbol("|")` | `.track_symbol(Some("|"))` | v0.23 |

### Not automated (manual follow-up)

- `block::Title` alignment/position chaining: `.alignment(Alignment::Center)` → `.centered()`
- `Flex::SpaceAround` semantic behavior change → `Flex::SpaceEvenly`
- `Backend` trait: new associated `Error` type and `clear_region` method
- `Marker` non-exhaustive additions (wildcard arm)
- Cargo.toml version bump

### Codemod command

```bash
bunx codemod@latest run ratatui-breaking-changes --target /path/to/vtcode
```

---

## End-to-End Results

Tested against demo projects built from real VT Code patterns across all six libraries:

| Codemod | Tests | False Positives | Notes |
|---|---|---|---|
| rand 0.8 → 0.9 | 6 | 0 | non-rand `.gen()` skipped by file guard |
| clap v3 → v4 | 13 | 0 | AppSettings, derive, builder, ErrorKind |
| axum 0.7 → 0.8 | 5 | 0 | colon-style → brace-style paths |
| hyper 0.14 → 1.x | 7 | 0 | Client and HttpConnector paths |
| tree-sitter 0.24 → 0.25 | 7 | 0 | FFI + Rust method forms |
| ratatui 0.28/0.29 → 0.30 | 11 | 0 | `frame.size()` guarded to `frame`/`terminal` receivers; `List::highlight_style` preserved |
| **Total** | **49** | **0** | |

All workflows validate. Each codemod has a dedicated skill for post-migration AI-assisted manual follow-up.

## Reproduction

```bash
# Validate all workflows
for c in axum-0-7-to-0-8 clap-v3-to-v4 hyper-0-14-to-1-0 rand-0.8-to-0.9 tree-sitter-0-24-to-0-25 ratatui-breaking-changes; do
  cd codemods/$c && bunx codemod@latest workflow validate -w workflow.yaml && cd ../..
done

# Run all test suites
for c in axum-0-7-to-0-8 clap-v3-to-v4 hyper-0-14-to-1-0 rand-0.8-to-0.9 tree-sitter-0-24-to-0-25 ratatui-breaking-changes; do
  cd codemods/$c && bunx codemod@latest jssg test -l rust ./scripts/codemod.ts --strictness loose && cd ../..
done

# Run against a target project
for c in rand-0-8-to-0-9 axum-0-7-to-0-8 clap-v3-to-v4 hyper-0-14-to-1-0 tree-sitter-0-24-to-0-25 ratatui-breaking-changes; do
  bunx codemod@latest workflow run -w codemods/$c/workflow.yaml --target /path/to/project --allow-dirty
done
```
