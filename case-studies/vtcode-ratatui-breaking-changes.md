# Case Study: Migrating VT Code from ratatui 0.28 to 0.30

This write-up shows how the `ratatui-breaking-changes` codemod fits into a real migration on [vinhnx/VTCode](https://github.com/vinhnx/VTCode), an open-source coding agent written in Rust.

VT Code is an LLM-native coding agent with a TUI built on ratatui, featuring shell safety, multi-provider support, skills support, and protocol integrations. The TUI layer relies heavily on ratatui widgets, layout primitives, and terminal management — making it a realistic test case for automated API migration.

## Migration target

- Library: `ratatui`
- From: `0.28.x` / `0.29.x`
- To: `0.30.x`
- Codemod: `ratatui-breaking-changes`

## Why this case is useful

Ratatui has accumulated significant API churn across versions 0.24 through 0.30. The breaking changes are of two kinds:

1. **Deterministic renames** — method names, import paths, type names that change mechanically
2. **Semantic changes** — behavior changes, new required trait methods, non-exhaustive enums

The codemod targets the first category, automating the repetitive API churn and leaving the semantic changes for manual review.

## What the codemod automates

### Import path updates (v0.28)

```rust
// Before
use ratatui::terminal::{CompletedFrame, Frame, Terminal, Viewport};

// After
use ratatui::{CompletedFrame, Frame, Terminal, Viewport};
```

### Frame::size() → Frame::area() (v0.28)

```rust
// Before
let size = frame.size();

// After
let size = frame.area();
```

### Spans → Line (v0.24)

```rust
// Before
let msg = Spans::from("hello");
let items: Vec<Spans> = vec![Spans::from("line 1")];

// After
let msg = Line::from("hello");
let items: Vec<Line> = vec![Line::from("line 1")];
```

### block::Title → Line (v0.30)

```rust
// Before
use ratatui::widgets::block::{Title, Position};
let block = Block::bordered()
    .title(Title::from("Header"))
    .title(Title::from("Footer").position(Position::Bottom));

// After
use ratatui::widgets::TitlePosition;
let block = Block::bordered()
    .title(Line::from("Header"))
    .title(Line::from("Footer").position(TitlePosition::Bottom));
```

### Table::highlight_style → row_highlight_style (v0.29)

The codemod correctly renames only `Table::highlight_style`, preserving `List::highlight_style` which kept its original name:

```rust
// Before
let table = Table::new(rows, widths)
    .highlight_style(Style::new().reversed());

// After
let table = Table::new(rows, widths)
    .row_highlight_style(Style::new().reversed());

// List is NOT renamed
let list = List::new(items)
    .highlight_style(Style::new().reversed()); // unchanged
```

### title_on_bottom() → title_bottom() (v0.27)

```rust
// Before
let block = Block::bordered().title("Title").title_on_bottom();

// After
let block = Block::bordered().title("Title").title_bottom();
```

### Rect::inner(&Margin{...}) → Rect::inner(Margin{...}) (v0.27)

```rust
// Before
let inner = area.inner(&Margin { vertical: 1, horizontal: 2 });

// After
let inner = area.inner(Margin { vertical: 1, horizontal: 2 });
```

### Buffer::filled(&Cell) → Buffer::filled(Cell) (v0.27)

```rust
// Before
Buffer::filled(area, &Cell::new("X"));

// After
Buffer::filled(area, Cell::new("X"));
```

### BorderType::line_symbols → border_symbols (v0.24)

```rust
// Before
let set = BorderType::line_symbols(BorderType::Plain);

// After
let set = BorderType::border_symbols(BorderType::Plain);
```

### Scrollbar track_symbol (v0.23)

```rust
// Before
let bar = Scrollbar::default().track_symbol("|");

// After
let bar = Scrollbar::default().track_symbol(Some("|"));
```

### symbols::line::Set → symbols::border::Set (v0.24)

```rust
// Before
let set: ratatui::symbols::line::Set = ...;

// After
let set: ratatui::symbols::border::Set = ...;
```

## What still needs manual follow-up

### 1. Title alignment/position chaining

The codemod converts `Title::from(...)` to `Line::from(...)`, but the chained `.alignment(Alignment::Center)` and `.position(TitlePosition::Bottom)` methods need manual adjustment:

```rust
// Codemod output (functional but incomplete)
.title(Line::from(" VT Code ").alignment(Alignment::Center))
.title(Line::from(" v0.2.0 ").position(TitlePosition::Bottom));

// Ideal manual cleanup
.title(Line::from(" VT Code ").centered())
.title_bottom(Line::from(" v0.2.0"));
```

### 2. Cargo.toml dependency update

Update manually:

```toml
ratatui = "0.30"
```

### 3. Backend trait changes (v0.30)

Custom backends need an associated `Error` type and `clear_region` method:

```rust
impl Backend for MyBackend {
    type Error = std::io::Error;
    fn clear_region(&mut self, area: Rect) -> Result<(), Self::Error> { ... }
}
```

### 4. Flex::SpaceAround behavior change

If using `Flex::SpaceAround`, the behavior changed to match flexbox. Use `Flex::SpaceEvenly` for the old behavior.

### 5. Marker is now non-exhaustive

Add a wildcard arm to exhaustive Marker matches.

## End-to-end test results

### JSSG Unit Tests

```
running 9 tests
test frame-size           ... ok
test imports-terminal     ... ok
test list-highlight-style ... ok
test no-op                ... ok
test rect-inner           ... ok
test spans-removal        ... ok
test table-highlight      ... ok
test title-on-bottom      ... ok
test vtcode-real-patterns ... ok

test result: ok. 9 passed; 0 failed
```

### Demo project test

A standalone TUI app with old ratatui patterns:

| Pattern | Before | After |
|---------|--------|-------|
| Terminal imports | `use ratatui::terminal::{...}` | `use ratatui::{...}` |
| Spans type | `Spans::from(...)` | `Line::from(...)` |
| Frame size | `frame.size()` | `frame.area()` |
| Table highlight | `.highlight_style(...)` | `.row_highlight_style(...)` |
| List highlight | `.highlight_style(...)` | `.highlight_style(...)` (preserved) |
| title_on_bottom | `.title_on_bottom()` | `.title_bottom()` |
| Rect inner | `.inner(&Margin{...})` | `.inner(Margin{...})` |
| Buffer filled | `Buffer::filled(area, &Cell::new(...))` | `Buffer::filled(area, Cell::new(...))` |

### VTCode baseline project test

A multi-file project simulating VT Code's TUI structure:

| File | Changes Applied |
|------|----------------|
| main.rs | Terminal module import, TitlePosition import, Spans→Line |
| app.rs | Terminal module import, TitlePosition import, Spans→Line |
| ui.rs | frame.size→area, Title→Line, Position→TitlePosition, Spans→Line, Margin ref removal, Table highlight_style→row_highlight_style, List highlight_style preserved, Buffer::filled signature |

## Suggested reproduction workflow

```bash
cd codemods/ratatui-breaking-changes

# Run unit tests
npx codemod@latest jssg test -l rust ./scripts/codemod.ts -v --strictness loose

# Validate workflow
npx codemod@latest workflow validate -w workflow.yaml

# Run against your project
npx codemod@latest workflow run -w workflow.yaml --target /path/to/project --allow-dirty
```

Then manually:
1. Fix Title alignment/position chaining
2. Update `Cargo.toml` to `ratatui = "0.30"`
3. Handle Backend trait changes if implementing custom backends
4. Run `cargo check` and `cargo test`

## Key takeaway

The ratatui breaking changes codemod handles the mechanical API renames that account for the majority of the migration surface. For a TUI-heavy project like VT Code, that means the developer can focus on the smaller number of semantic adjustments (Title API, Backend trait, Flex behavior) rather than manually renaming dozens of method calls and import paths.

The critical improvement in this codemod is that it correctly distinguishes between `Table::highlight_style` (renamed to `row_highlight_style`) and `List::highlight_style` (kept as-is), avoiding a common false positive that would break List widgets.
