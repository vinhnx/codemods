# ratatui-breaking-changes

Automate the most common deterministic API renames in the [ratatui](https://github.com/ratatui/ratatui) TUI library migration from v0.24–v0.30.

## What it does

### Cargo.toml dependency updates

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

### NOT renamed

- `List::highlight_style()` keeps its name (only Table was renamed)

## Usage

```bash
# Validate the workflow
bunx codemod@latest workflow validate -w workflow.yaml

# Run against your project
bunx codemod@latest workflow run -w workflow.yaml --target /path/to/your/rust/project
```

## Manual follow-up

After running, you should:

1. Review `Cargo.toml` updates and feature flags
2. Clean up Title alignment/position chaining: `.alignment(Alignment::Center)` → `.centered()`, `.position(TitlePosition::Bottom)` → `title_bottom()`
3. Handle `Flex::SpaceAround` → `Flex::SpaceEvenly` if using the old behavior
4. Review `Backend` trait implementations for the new `Error` associated type and `clear_region` method
5. Handle `Marker` exhaustive match additions (add wildcard arm)
6. Run `cargo check` and `cargo test`

## Development

```bash
# Run tests
bunx codemod@latest jssg test -l rust ./scripts/codemod.ts -v --strictness loose

# Validate workflow
bunx codemod@latest workflow validate -w workflow.yaml
```

## References

- [BREAKING-CHANGES.md](https://github.com/ratatui/ratatui/blob/main/BREAKING-CHANGES.md)
- [API Docs](https://docs.rs/ratatui/latest/ratatui/)
- [Ratatui Website](https://ratatui.rs/)

## License

MIT
