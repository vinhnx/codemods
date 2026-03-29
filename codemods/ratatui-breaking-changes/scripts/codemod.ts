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
    let updated = source;

    // Simple string dep: ratatui = "0.2x.x" or "0.29.x" → "0.30"
    updated = updated.replace(
        /^(\s*ratatui\s*=\s*")0\.2[0-9](?:\.[0-9A-Za-z_.-]+)?("\s*)$/gm,
        "$10.30$2",
    );

    // Inline table dep: ratatui = { version = "0.2x.x", ... }
    updated = updated.replace(
        /(\bratatui\s*=\s*\{[^\n}]*\bversion\s*=\s*")0\.2[0-9](?:\.[0-9A-Za-z_.-]+)?("[^\n}]*\})/g,
        "$10.30$2",
    );

    return updated;
}

function migrateTerminalModuleImports(source: string): string {
    // use ratatui::terminal::{CompletedFrame, Frame, Terminal, ...};
    // → use ratatui::{CompletedFrame, Frame, Terminal, ...};
    source = source.replace(
        /use\s+ratatui::terminal::(\{[^}]+\});/g,
        "use ratatui::$1;",
    );

    // use ratatui::terminal::Terminal; → use ratatui::Terminal;
    source = source.replace(
        /use\s+ratatui::terminal::([A-Z][A-Za-z]+);/g,
        "use ratatui::$1;",
    );

    // use ratatui::terminal::Viewport; → use ratatui::Viewport;
    source = source.replace(
        /use\s+ratatui::terminal::Viewport;/g,
        "use ratatui::Viewport;",
    );

    return source;
}

function migrateBlockTitleImports(source: string): string {
    // use ratatui::widgets::block::{Title, Position};
    // → convert Position to TitlePosition, remove Title (use Line instead)
    source = source.replace(
        /use\s+ratatui::widgets::block::\{([^}]*)\};/g,
        (_match, imports) => {
            const entries = imports
                .split(",")
                .map((e: string) => e.trim())
                .filter((e: string) => e.length > 0);

            const rewritten = entries.map((e: string) => {
                if (e === "Position") return "TitlePosition";
                if (e === "Title") return ""; // Title no longer exists, Line is used instead
                return e;
            }).filter((e: string) => e.length > 0);

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

    // use ratatui::widgets::block::Title; → removed (use Line instead)
    source = source.replace(
        /^\s*use\s+ratatui::widgets::block::Title;\s*$/gm,
        "// TODO(ratatui): `block::Title` removed; use `Line` with `Block::title()` instead",
    );

    // use ratatui::widgets::block::Position; → use ratatui::widgets::TitlePosition;
    source = source.replace(
        /use\s+ratatui::widgets::block::Position;/g,
        "use ratatui::widgets::TitlePosition;",
    );

    // If Position::Bottom/Top is used but no TitlePosition import exists,
    // add one after existing ratatui widget imports
    if (/\bTitlePosition::/.test(source) && !/use\s+ratatui[^;]*TitlePosition/.test(source)) {
        source = source.replace(
            /(use\s+ratatui::widgets::[^;]+;\n)/,
            "$1use ratatui::widgets::TitlePosition;\n",
        );
    }

    return source;
}

function migrateFrameSizeToArea(source: string): string {
    // .size() → .area() when called on frame-like expressions
    source = source.replace(/\b\.size\(\)/g, ".area()");

    // Frame::size is deprecated → use Frame::area
    // This also catches "frame.size()" which is already handled above
    return source;
}

function migrateTableHighlightStyle(source: string): string {
    // .highlight_style(...) → .row_highlight_style(...)
    source = source.replace(/\.highlight_style\(/g, ".row_highlight_style(");
    return source;
}

function migrateRectInner(source: string): string {
    // .inner(&Margin { ... }) → .inner(Margin { ... })
    source = source.replace(/\.inner\(\s*&\s*Margin\b/g, ".inner(Margin");
    return source;
}

function migrateBufferFilled(source: string): string {
    // Buffer::filled(area, &Cell::new(...)) → Buffer::filled(area, Cell::new(...))
    source = source.replace(
        /Buffer::filled\(\s*([^,]+),\s*&\s*Cell::/g,
        "Buffer::filled($1, Cell::",
    );
    return source;
}

function migrateSpansToLine(source: string): string {
    // Spans:: → Line:: (Spans was removed in v0.24)
    source = source.replace(/\bSpans::/g, "Line::");

    // Spans as a type: Spans<'a> → Line<'a>
    source = source.replace(/\bSpans</g, "Line<");

    // Spans as standalone type
    source = source.replace(/\bSpans\b/g, "Line");

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
    // Only when used in widget context (not layout::Position)
    source = source.replace(
        /\bPosition::(Bottom|Top)\b/g,
        "TitlePosition::$1",
    );

    return source;
}

function migrateBorderTypeLineSymbols(source: string): string {
    // BorderType::line_symbols → BorderType::border_symbols
    source = source.replace(/BorderType::line_symbols\b/g, "BorderType::border_symbols");
    return source;
}

function migrateSymbolsLineSet(source: string): string {
    // symbols::line::Set → symbols::border::Set
    source = source.replace(/\bsymbols::line::Set\b/g, "symbols::border::Set");
    return source;
}

function migrateScrollbarSymbols(source: string): string {
    // use ratatui::widgets::scrollbar::{Scrollbar, Set};
    // → split into separate imports
    source = source.replace(
        /^(\s*)use\s+ratatui::widgets::scrollbar::\{([^}]*)\};/gm,
        (fullMatch: string, indent: string, imports: string) => {
            const entries = imports
                .split(",")
                .map((e: string) => e.trim())
                .filter((e: string) => e.length > 0);

            const widgetItems: string[] = [];
            const symbolItems: string[] = [];

            for (const entry of entries) {
                if (entry === "Scrollbar" || entry === "ScrollbarDirection" || entry === "ScrollbarOrientation") {
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
    // .track_symbol("|") → .track_symbol(Some("|"))
    // Only when the argument is a string literal (not already Some(...))
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
    source = migrateFrameSizeToArea(source);
    source = migrateTableHighlightStyle(source);
    source = migrateRectInner(source);
    source = migrateBufferFilled(source);
    source = migrateSpansToLine(source);
    source = migrateBlockTitlePosition(source);
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
