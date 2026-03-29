# ratatui v0.24–v0.30 Migration Reference

Use this to handle everything the codemod cannot automate.

## What the codemod already handles

- `ratatui = "0.2x.x"` → `ratatui = "0.30"` in Cargo.toml
- `use ratatui::terminal::{...}` → `use ratatui::{...}`
- `frame.size()` → `frame.area()`
- `.highlight_style(...)` → `.row_highlight_style(...)`
- `Spans` → `Line`
- `Position::Bottom/Top` → `TitlePosition::Bottom/Top`
- `.inner(&Margin{...})` → `.inner(Margin{...})`
- `Buffer::filled(area, &Cell::new(...))` → `Buffer::filled(area, Cell::new(...))`
- `BorderType::line_symbols` → `BorderType::border_symbols`
- `symbols::line::Set` → `symbols::border::Set`
- `scrollbar` import restructuring
- `.track_symbol("...")` → `.track_symbol(Some("..."))`

---

## What requires manual follow-up

### 1. block::Title removal (v0.30)

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
    .title(Line::from("Status"))
    .title_position(TitlePosition::Bottom);
```

### 2. Flex::SpaceAround behavior change (v0.30)

The old `SpaceAround` behavior is now `SpaceEvenly`:

```rust
// v0.29
Layout::horizontal([Length(1), Length(2)]).flex(Flex::SpaceAround).split(area);

// v0.30 — if you want the old behavior
Layout::horizontal([Length(1), Length(2)]).flex(Flex::SpaceEvenly).split(area);
```

### 3. Backend trait changes (v0.30)

Custom backends need an associated `Error` type and `clear_region` method:

```rust
// v0.29
impl Backend for MyBackend {
    fn draw<'a, I>(&mut self, content: I) -> Result<()>
    where I: Iterator<Item = (u16, u16, &'a Cell)> { ... }
}

// v0.30
impl Backend for MyBackend {
    type Error = std::io::Error;
    fn draw<'a, I>(&mut self, content: I) -> Result<(), Self::Error>
    where I: Iterator<Item = (u16, u16, &'a Cell)> { ... }
    fn clear_region(&mut self, area: Rect) -> Result<(), Self::Error> { ... }
}
```

### 4. Marker is now non-exhaustive (v0.30)

Add a wildcard arm to exhaustive matches:

```rust
match marker {
    Marker::Dot => { /* ... */ }
    Marker::Block => { /* ... */ }
    Marker::Bar => { /* ... */ }
    Marker::Braille => { /* ... */ }
    Marker::HalfBlock => { /* ... */ }
    _ => { /* ... */ }  // Required in v0.30
}
```

### 5. Style no longer implements Styled (v0.30)

Remove `Stylize` import if no longer needed:

```rust
// v0.29
use ratatui::style::Stylize;
let style = Style::new().red();

// v0.30 — Stylize import no longer needed for Style methods
let style = Style::new().red();
```

### 6. Layout::init_cache and feature flags (v0.30)

```rust
// Only available with layout-cache feature
Layout::init_cache(NonZeroUsize::new(100).unwrap());
```

### 7. TestBackend error type (v0.30)

```rust
// v0.29 — uses std::io::Error
fn test_something() -> io::Result<()> { ... }

// v0.30 — TestBackend uses Infallible
fn test_something() -> Result<(), core::convert::Infallible> { ... }
```

### 8. List::highlight_symbol accepts Into<Line> (v0.30)

```rust
// v0.29
list.highlight_symbol(">> ");

// v0.30 — still works but accepts Into<Line>
list.highlight_symbol(">> ");
```

### 9. Feature flag changes (v0.30)

```toml
# If using default-features = false, explicitly enable layout-cache
ratatui = { version = "0.30", default-features = false, features = ["layout-cache"] }
```

---

## Verification checklist

After running the codemod:
- [ ] `Cargo.toml` updated to `ratatui = "0.30"`
- [ ] Feature flags reviewed (especially `default-features = false` case)
- [ ] `block::Title` usages converted to `Line`
- [ ] `Position::Bottom/Top` → `TitlePosition::Bottom/Top`
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
