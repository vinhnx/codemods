import type { Transform } from "codemod:ast-grep";
import type Rust from "codemod:ast-grep/langs/rust";

function isLikelyRatatuiSource(source: string): boolean {
    return /\bratatui::|^\s*use\s+ratatui(?:::{1,2}|\s*[{;])/m.test(source);
}

function isLikelyCargoToml(source: string): boolean {
    return /^\s*\[(?:package|workspace|dependencies|dev-dependencies|build-dependencies)/m.test(
        source,
    );
}

function migrateRatatuiCargoToml(source: string): string {
    // Simple string dep: ratatui = "0.2x.x" → "0.30"
    source = source.replace(
        /^(\s*ratatui\s*=\s*")0\.2[0-9](?:\.[0-9A-Za-z_.-]+)?("\s*)$/gm,
        "$10.30$2",
    );
    // Inline table dep: ratatui = { version = "0.2x.x", ... }
    source = source.replace(
        /(\bratatui\s*=\s*\{[^\n}]*\bversion\s*=\s*")0\.2[0-9](?:\.[0-9A-Za-z_.-]+)?("[^\n}]*\})/g,
        "$10.30$2",
    );
    return source;
}

function migrateTerminalModuleImports(source: string): string {
    // use ratatui::terminal::{CompletedFrame, Frame, Terminal, ...};
    // → use ratatui::{CompletedFrame, Frame, Terminal, ...};
    source = source.replace(
        /use\s+ratatui::terminal::(\{[^}]+\});/g,
        "use ratatui::$1;",
    );
    // use ratatui::terminal::Terminal; → use ratatui::Terminal;
    // Also handles Viewport and any other single type
    source = source.replace(
        /use\s+ratatui::terminal::([A-Za-z]+);/g,
        "use ratatui::$1;",
    );
    return source;
}

function migrateBlockTitleImports(source: string): string {
    // use ratatui::widgets::block::{Title, Position};
    // → Position becomes TitlePosition, Title is removed (use Line instead)
    source = source.replace(
        /use\s+ratatui::widgets::block::\{([^}]*)\};/g,
        (_match: string, imports: string) => {
            const entries = imports
                .split(",")
                .map((e: string) => e.trim())
                .filter((e: string) => e.length > 0);

            const rewritten: string[] = [];
            for (const e of entries) {
                if (e === "Title") continue; // removed, use Line instead
                if (e === "Position") {
                    rewritten.push("TitlePosition");
                } else {
                    rewritten.push(e);
                }
            }

            if (rewritten.length === 0) return "";
            if (rewritten.length === 1) return `use ratatui::widgets::${rewritten[0]};`;
            return `use ratatui::widgets::{${rewritten.join(", ")}};`;
        },
    );

    // use ratatui::widgets::block::BlockExt; → use ratatui::widgets::BlockExt;
    source = source.replace(
        /use\s+ratatui::widgets::block::BlockExt;/g,
        "use ratatui::widgets::BlockExt;",
    );

    // use ratatui::widgets::block::Title; → comment out (use Line instead)
    source = source.replace(
        /^\s*use\s+ratatui::widgets::block::Title;\s*$/gm,
        "// TODO(ratatui): `block::Title` removed; use `Line` with `Block::title()` instead",
    );

    // use ratatui::widgets::block::Position; → use ratatui::widgets::TitlePosition;
    source = source.replace(
        /use\s+ratatui::widgets::block::Position;/g,
        "use ratatui::widgets::TitlePosition;",
    );

    return source;
}

function ensureTitlePositionImport(source: string): string {
    // Add TitlePosition import if Position::Bottom/Top was renamed but import is missing
    if (
        /\bTitlePosition::/.test(source) &&
        !/use\s+ratatui[^;]*TitlePosition/.test(source)
    ) {
        source = source.replace(
            /(use\s+ratatui::widgets::[^;]+;\n)/,
            "$1use ratatui::widgets::TitlePosition;\n",
        );
    }
    return source;
}

function migrateTitleToLine(source: string): string {
    // Title::from(...) → Line::from(...) (block::Title removed in v0.30)
    source = source.replace(/\bTitle::from\(/g, "Line::from(");
    // Title::new(...) → Line::from(...)
    source = source.replace(/\bTitle::new\(/g, "Line::from(");
    return source;
}

function migrateBlockTitlePosition(source: string): string {
    // Position::Bottom → TitlePosition::Bottom
    // Position::Top → TitlePosition::Top
    // Only matches Position::Bottom|Top (not layout::Position which has different variants)
    source = source.replace(
        /\bPosition::(Bottom|Top)\b/g,
        "TitlePosition::$1",
    );
    return source;
}

function migrateBlockTitleOnBottom(source: string): string {
    // .title_on_bottom() → .title_bottom() (deprecated in v0.27, removed later)
    source = source.replace(/\.title_on_bottom\(\)/g, ".title_bottom()");
    return source;
}

function migrateFrameSizeToArea(source: string): string {
    // frame.size() → frame.area() (Frame::size deprecated in v0.28)
    // terminal.size() → terminal.area() (Terminal::size deprecated in v0.28)
    // Only rename when the receiver is explicitly named `frame` or `terminal`
    // to avoid false positives on Vec, String, or other .size() calls in ratatui files.
    source = source.replace(/\b(frame|terminal)\s*\.size\(\)/g, "$1.area()");
    return source;
}

function migrateTableHighlightStyle(source: string): string {
    // Table::highlight_style → Table::row_highlight_style (v0.29)
    // List::highlight_style keeps its name — only Table was renamed.
    //
    // Match chains starting from Table::new/Table::default up to the
    // next .highlight_style( call. [^;]*? is lazy and stops at the first
    // .highlight_style( it finds, matching both single-line and multiline chains.
    // [^;] matches newlines in JS, so multi-line chains are covered.
    source = source.replace(
        /(Table::(?:new|default)\([^;]*?)\.highlight_style\(/g,
        "$1.row_highlight_style(",
    );
    return source;
}

function migrateRectInner(source: string): string {
    // .inner(&Margin { ... }) → .inner(Margin { ... }) (v0.27)
    source = source.replace(/\.inner\(\s*&\s*Margin\b/g, ".inner(Margin");
    return source;
}

function migrateBufferFilled(source: string): string {
    // Buffer::filled(area, &Cell::new(...)) → Buffer::filled(area, Cell::new(...)) (v0.27)
    source = source.replace(
        /Buffer::filled\(\s*([^,]+),\s*&\s*Cell::/g,
        "Buffer::filled($1, Cell::",
    );
    return source;
}

function migrateSpansToLine(source: string): string {
    // Spans:: → Line:: (Spans removed in v0.24)
    source = source.replace(/\bSpans::/g, "Line::");
    // Spans<'a> → Line<'a>
    source = source.replace(/\bSpans</g, "Line<");
    // Spans as standalone type token
    source = source.replace(/\bSpans\b/g, "Line");
    return source;
}

function migrateBorderTypeLineSymbols(source: string): string {
    // BorderType::line_symbols → BorderType::border_symbols (v0.24)
    source = source.replace(/BorderType::line_symbols\b/g, "BorderType::border_symbols");
    return source;
}

function migrateSymbolsLineSet(source: string): string {
    // symbols::line::Set → symbols::border::Set (v0.24)
    source = source.replace(/\bsymbols::line::Set\b/g, "symbols::border::Set");
    return source;
}

const SCROLLBAR_WIDGET_TYPES = new Set([
    "Scrollbar",
    "ScrollbarDirection",
    "ScrollbarOrientation",
]);

function migrateScrollbarSymbols(source: string): string {
    // use ratatui::widgets::scrollbar::{Scrollbar, Set};
    // → split: Scrollbar stays as widget import, Set moves to symbols
    source = source.replace(
        /^(\s*)use\s+ratatui::widgets::scrollbar::\{([^}]*)\};/gm,
        (_full: string, indent: string, imports: string) => {
            const entries = imports
                .split(",")
                .map((e: string) => e.trim())
                .filter((e: string) => e.length > 0);

            const widgetItems: string[] = [];
            const symbolItems: string[] = [];

            for (const entry of entries) {
                if (SCROLLBAR_WIDGET_TYPES.has(entry)) {
                    widgetItems.push(entry);
                } else if (entry === "Set") {
                    symbolItems.push("scrollbar::Set");
                } else {
                    widgetItems.push(entry);
                }
            }

            const lines: string[] = [];
            for (const item of widgetItems) {
                lines.push(`${indent}use ratatui::widgets::${item};`);
            }
            for (const item of symbolItems) {
                lines.push(`${indent}use ratatui::symbols::${item};`);
            }
            return lines.join("\n");
        },
    );

    // use ratatui::widgets::scrollbar::Scrollbar; → use ratatui::widgets::Scrollbar;
    source = source.replace(
        /use\s+ratatui::widgets::scrollbar::([A-Za-z]+);/g,
        "use ratatui::widgets::$1;",
    );
    return source;
}

function migrateScrollbarTrackSymbol(source: string): string {
    // .track_symbol("|") → .track_symbol(Some("|")) (v0.23)
    source = source.replace(
        /\.track_symbol\(\s*(?!\bSome\b)(["'])([^"']*)\1\s*\)/g,
        '.track_symbol(Some("$2"))',
    );
    return source;
}

function migrateRatatuiSource(source: string): string {
    source = migrateTerminalModuleImports(source);
    source = migrateBlockTitleImports(source);
    source = migrateTitleToLine(source);
    source = migrateBlockTitlePosition(source);
    source = ensureTitlePositionImport(source);
    source = migrateBlockTitleOnBottom(source);
    source = migrateFrameSizeToArea(source);
    source = migrateTableHighlightStyle(source);
    source = migrateRectInner(source);
    source = migrateBufferFilled(source);
    source = migrateSpansToLine(source);
    source = migrateBorderTypeLineSymbols(source);
    source = migrateSymbolsLineSet(source);
    source = migrateScrollbarSymbols(source);
    source = migrateScrollbarTrackSymbol(source);
    return source;
}

const transform: Transform<Rust> = async (root: any) => {
    const rootNode = root.root();
    let source = rootNode.text();

    if (isLikelyCargoToml(source)) {
        return migrateRatatuiCargoToml(source);
    }

    if (!isLikelyRatatuiSource(source)) {
        return source;
    }

    return migrateRatatuiSource(source);
};

export default transform;
