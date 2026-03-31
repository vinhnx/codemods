# ratatui v0.24–v0.30 Migration Reference

Use this to handle everything the codemod cannot automate.

## What the codemod already handles

- `use ratatui::terminal::{...}` → `use ratatui::{...}`
- `frame.size()` → `frame.area()`
- `Table::highlight_style(...)` → `Table::row_highlight_style(...)`
- `List::highlight_style()` is **NOT** renamed (correct behavior)
- `Spans` → `Line`
- `Title::from(...)` → `Line::from(...)`
- `Position::Bottom/Top` → `TitlePosition::Bottom/Top`
- `.title_on_bottom()` → `.title_bottom()`
- `.inner(&Margin{...})` → `.inner(Margin{...})`
- `Buffer::filled(area, &Cell::new(...))` → `Buffer::filled(area, Cell::new(...))`
- `BorderType::line_symbols` → `BorderType::border_symbols`
- `symbols::line::Set` → `symbols::border::Set`
- `scrollbar` import restructuring
- `.track_symbol("...")` → `.track_symbol(Some("..."))`

---

## What requires manual follow-up

### 0. Cargo.toml

Update `ratatui` to `0.30.0` in your manifest. This codemod does not rewrite TOML.

### 1. Title alignment/position chaining (v0.30)

The codemod converts `Title::from(...)` to `Line::from(...)`, but chained methods need manual adjustment:

```rust
// Codemod output (functional but incomplete)
.title(Line::from(" VT Code ").alignment(Alignment::Center))
.title(Line::from(" v0.1.0 ").position(TitlePosition::Bottom));

// Ideal manual cleanup
.title(Line::from(" VT Code ").centered())
.title_bottom(Line::from(" v0.1.0"));
```

### 2. block::Title removal (v0.30)

`block::Title` no longer exists. Use `Line` directly with `Block::title()`:

```rust
// v0.29
use ratatui::widgets::block::{Title, Position};
let block = Block::default()
    .title(Title::from("Hello").alignment(Alignment::Center))
    .title(Title::from("Status").position(Position::Bottom));

// v0.30
use ratatui::widgets::TitlePosition;
let block = Block::default()
    .title(Line::from("Hello").centered())
    .title_bottom(Line::from("Status"));
```

### 3. Flex::SpaceAround behavior change (v0.30)

The old `SpaceAround` behavior is now `SpaceEvenly`:

```rust
// v0.29
Layout::horizontal([Length(1), Length(2)]).flex(Flex::SpaceAround).split(area);

// v0.30 — if you want the old behavior
Layout::horizontal([Length(1), Length(2)]).flex(Flex::SpaceEvenly).split(area);
```

### 4. Backend trait changes (v0.30)

Custom backends need an associated `Error` type and `clear_region` method:

```rust
impl Backend for MyBackend {
    type Error = std::io::Error;
    fn clear_region(&mut self, area: Rect) -> Result<(), Self::Error> { ... }
}
```

### 5. Marker is now non-exhaustive (v0.30)

Add a wildcard arm to exhaustive matches:

```rust
match marker {
    Marker::Dot => { /* ... */ }
    Marker::Block => { /* ... */ }
    _ => { /* ... */ }  // Required in v0.30
}
```

### 6. Style no longer implements Styled (v0.30)

Remove `Stylize` import if no longer needed for `Style` method calls:

```rust
// v0.29
use ratatui::style::Stylize;
let style = Style::new().red();

// v0.30 — Stylize import no longer needed for Style methods
let style = Style::new().red();
```

### 7. Layout::init_cache and feature flags (v0.30)

```rust
// Only available with layout-cache feature
Layout::init_cache(NonZeroUsize::new(100).unwrap());
```

If using `default-features = false`, re-enable layout-cache:
```toml
ratatui = { version = "0.30", default-features = false, features = ["layout-cache"] }
```

### 8. TestBackend error type (v0.30)

```rust
// v0.30 — TestBackend uses Infallible
fn test_something() -> Result<(), core::convert::Infallible> { ... }
```

---

## Verification checklist

After running the codemod:
- [ ] `Cargo.toml` updated to `ratatui = "0.30"`
- [ ] Feature flags reviewed (especially `default-features = false` case)
- [ ] `Title::from` alignment/position chaining cleaned up
- [ ] `Position::Bottom/Top` → `TitlePosition::Bottom/Top`
- [ ] `.title_on_bottom()` → `.title_bottom()`
- [ ] `List::highlight_style()` preserved (not renamed)
- [ ] `Table::highlight_style()` → `row_highlight_style()`
- [ ] `Flex::SpaceAround` behavior verified
- [ ] Custom `Backend` implementations updated with `Error` type and `clear_region`
- [ ] `Marker` matches updated with wildcard arm
- [ ] `Stylize` imports removed if no longer needed
- [ ] `cargo check` passes
- [ ] `cargo test` passes

## References

- [BREAKING-CHANGES.md](https://github.com/ratatui/ratatui/blob/main/BREAKING-CHANGES.md)
- [Changelog](https://github.com/ratatui/ratatui/blob/main/CHANGELOG.md)
- [API Docs](https://docs.rs/ratatui/latest/ratatui/)
- [Ratatui Website](https://ratatui.rs/)
