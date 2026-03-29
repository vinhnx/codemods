---
name: ratatui-breaking-changes
description: Migrate Rust ratatui TUI library across major breaking changes (v0.24–v0.30). Handles Frame::size→area, terminal module privatization, Table renames, Spans→Line, block::Title removal, title_on_bottom, and more. Use this when a Rust project uses ratatui and needs to upgrade to the latest version.
compatibility: ">=1.0.0"
metadata:
  version: "1.0.1"
---

## What this codemod does

Automates the most common deterministic API renames in the ratatui TUI library migration from v0.24–v0.30.

### Cargo.toml
- `ratatui = "0.2x.x"` → `ratatui = "0.30"`
- `ratatui = { version = "0.2x.x", ... }` → `ratatui = { version = "0.30", ... }`

### Import path updates
- `use ratatui::terminal::{Terminal, Frame, ...}` → `use ratatui::{Terminal, Frame, ...}`
- `use ratatui::widgets::block::{Title, Position}` → `use ratatui::widgets::TitlePosition` (Title removed)
- `use ratatui::widgets::block::BlockExt` → `use ratatui::widgets::BlockExt`
- `use ratatui::widgets::scrollbar::{Scrollbar, Set}` → split into widget/symbols imports

### Method renames
- `frame.size()` → `frame.area()` (v0.28)
- `Table::highlight_style(...)` → `Table::row_highlight_style(...)` (v0.29)
- `.title_on_bottom()` → `.title_bottom()` (v0.27)
- `BorderType::line_symbols(...)` → `BorderType::border_symbols(...)` (v0.24)
- `.track_symbol("|")` → `.track_symbol(Some("|"))` (v0.23)

### Type renames
- `Spans` → `Line` (v0.24 removal)
- `Title::from(...)` → `Line::from(...)` (v0.30)
- `Position::Bottom/Top` → `TitlePosition::Bottom/Top` (v0.30)
- `symbols::line::Set` → `symbols::border::Set` (v0.24)

### Signature simplifications
- `.inner(&Margin{...})` → `.inner(Margin{...})` (v0.27)
- `Buffer::filled(area, &Cell::new(...))` → `Buffer::filled(area, Cell::new(...))` (v0.27)

### What is NOT renamed
- `List::highlight_style()` keeps its name (only Table was renamed)
- `List::new(items).highlight_style(...)` is preserved

## How to invoke

```bash
npx codemod@latest run ratatui-breaking-changes --target /path/to/rust/project
```

Or via local workflow:
```bash
npx codemod@latest workflow run -w workflow.yaml --target /path/to/rust/project
```

## Manual follow-up required

After running:
1. Update `Cargo.toml` to `ratatui = "0.30"` and review feature flags
2. Clean up `Title` alignment/position chaining: `.alignment(Alignment::Center)` → `.centered()`, `.position(TitlePosition::Bottom)` → use `title_bottom()` method
3. Handle `Flex::SpaceAround` → `Flex::SpaceEvenly` if using the old behavior
4. Review `Backend` trait implementations for new `Error` type and `clear_region` method
5. Handle `Marker` non-exhaustive additions
6. Run `cargo check` and `cargo test`

## Reference

For the full list of manual follow-up steps, remaining API changes, and a verification checklist, read `references/migration-guide.md`.

## Limitations

Only covers deterministic API renames. Does not handle:
- `Backend` trait implementation changes (associated Error type, clear_region)
- `Flex::SpaceAround` semantic behavior change
- `Marker` non-exhaustive additions
- Type inference issues from `AsRef` impl additions
- `Style` no longer implementing `Styled`
