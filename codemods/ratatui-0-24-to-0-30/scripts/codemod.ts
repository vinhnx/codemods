import { parse } from "codemod:ast-grep";
import type { Edit, SgNode, Transform } from "codemod:ast-grep";
import type Rust from "codemod:ast-grep/langs/rust";

function isLikelyRatatuiSource(source: string): boolean {
    return /\bratatui::|^\s*use\s+ratatui(?:::{1,2}|\s*[{;])/m.test(source);
}

function applyEdits(rootNode: SgNode<Rust>, edits: Edit[]): string {
    if (edits.length === 0) {
        return rootNode.text();
    }

    const seen = new Set<string>();
    const uniqueEdits = edits
        .sort((left, right) => left.startPos - right.startPos || left.endPos - right.endPos)
        .filter((edit) => {
            const key = `${edit.startPos}:${edit.endPos}:${edit.insertedText}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });

    return rootNode.commitEdits(uniqueEdits);
}

function extractGroupedImports(statement: string): string[] | null {
    const braceStart = statement.indexOf("{");
    const braceEnd = statement.lastIndexOf("}");
    if (braceStart === -1 || braceEnd === -1 || braceEnd <= braceStart) {
        return null;
    }

    return statement
        .slice(braceStart + 1, braceEnd)
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
}

function rewriteTerminalUse(statement: string): string | null {
    if (statement.startsWith("use ratatui::terminal::{")) {
        return statement.replace("use ratatui::terminal::", "use ratatui::");
    }

    const singleImport = statement.match(/^use\s+ratatui::terminal::([A-Za-z_][A-Za-z0-9_]*);$/);
    if (singleImport) {
        return `use ratatui::${singleImport[1]};`;
    }

    return null;
}

function rewriteBlockUse(statement: string): string | null {
    if (statement.startsWith("use ratatui::widgets::block::{")) {
        const entries = extractGroupedImports(statement);
        if (!entries) {
            return null;
        }

        const widgetEntries: string[] = [];
        const extraLines: string[] = [];

        for (const entry of entries) {
            if (entry === "Title") {
                extraLines.push("use ratatui::text::Line;");
                continue;
            }

            if (entry === "Position") {
                widgetEntries.push("TitlePosition");
                continue;
            }

            widgetEntries.push(entry);
        }

        const lines: string[] = [];
        if (widgetEntries.length === 1) {
            lines.push(`use ratatui::widgets::${widgetEntries[0]};`);
        } else if (widgetEntries.length > 1) {
            lines.push(`use ratatui::widgets::{${widgetEntries.join(", ")}};`);
        }

        lines.push(...extraLines);
        return lines.length > 0 ? lines.join("\n") : null;
    }

    if (statement === "use ratatui::widgets::block::BlockExt;") {
        return "use ratatui::widgets::BlockExt;";
    }

    if (statement === "use ratatui::widgets::block::Title;") {
        return "use ratatui::text::Line;";
    }

    if (statement === "use ratatui::widgets::block::Position;") {
        return "use ratatui::widgets::TitlePosition;";
    }

    return null;
}

const SCROLLBAR_WIDGET_TYPES = new Set([
    "Scrollbar",
    "ScrollbarDirection",
    "ScrollbarOrientation",
]);

function rewriteScrollbarUse(statement: string): string | null {
    if (statement.startsWith("use ratatui::widgets::scrollbar::{")) {
        const entries = extractGroupedImports(statement);
        if (!entries) {
            return null;
        }

        const lines: string[] = [];
        for (const entry of entries) {
            if (SCROLLBAR_WIDGET_TYPES.has(entry)) {
                lines.push(`use ratatui::widgets::${entry};`);
                continue;
            }

            if (entry === "Set") {
                lines.push("use ratatui::symbols::scrollbar::Set;");
                continue;
            }

            lines.push(`use ratatui::widgets::${entry};`);
        }

        return lines.join("\n");
    }

    const directImport = statement.match(
        /^use\s+ratatui::widgets::scrollbar::([A-Za-z_][A-Za-z0-9_]*);$/,
    );
    if (!directImport) {
        return null;
    }

    const item = directImport[1];
    if (item === "Set") {
        return "use ratatui::symbols::scrollbar::Set;";
    }

    return `use ratatui::widgets::${item};`;
}

function rewriteUseStatements(source: string): string {
    const parsed = parse("rust", source);
    const rootNode = parsed.root() as SgNode<Rust>;
    const edits: Edit[] = [];

    for (const useStatement of rootNode.findAll({ rule: { pattern: "use $IMPORT;" } })) {
        const statement = useStatement.text();
        const rewritten =
            rewriteTerminalUse(statement) ??
            rewriteBlockUse(statement) ??
            rewriteScrollbarUse(statement);

        if (rewritten && rewritten !== statement) {
            const indent = " ".repeat(useStatement.range().start.column);
            const formatted = rewritten
                .split("\n")
                .map((line, index) => (index === 0 ? line : `${indent}${line}`))
                .join("\n");
            edits.push(useStatement.replace(formatted));
        }
    }

    return applyEdits(rootNode, edits);
}

function replaceSuffix(text: string, from: string, to: string): string {
    return text.endsWith(from) ? `${text.slice(0, -from.length)}${to}` : text;
}

function rewriteCallsAndIdentifiers(source: string): string {
    const parsed = parse("rust", source);
    const rootNode = parsed.root() as SgNode<Rust>;
    const edits: Edit[] = [];

    for (const call of rootNode.findAll({ rule: { pattern: "$CALLEE($$$ARGS)" } })) {
        const callee = call.getMatch("CALLEE");
        const args = call.getMultipleMatches("ARGS");
        if (!callee) {
            continue;
        }

        const calleeText = callee.text();

        if (calleeText === "Title::from" || calleeText === "Title::new") {
            edits.push(callee.replace("Line::from"));
            continue;
        }

        if (calleeText === "frame.size" || calleeText === "terminal.size") {
            edits.push(callee.replace(replaceSuffix(calleeText, ".size", ".area")));
            continue;
        }

        if (calleeText.endsWith(".title_on_bottom")) {
            edits.push(callee.replace(replaceSuffix(calleeText, ".title_on_bottom", ".title_bottom")));
            continue;
        }

        if (
            calleeText.endsWith(".highlight_style") &&
            (calleeText.startsWith("Table::new(") || calleeText.startsWith("Table::default()"))
        ) {
            edits.push(
                callee.replace(
                    replaceSuffix(calleeText, ".highlight_style", ".row_highlight_style"),
                ),
            );
            continue;
        }

        if (calleeText === "BorderType::line_symbols") {
            edits.push(callee.replace("BorderType::border_symbols"));
            continue;
        }

        if (calleeText === "Buffer::filled" && args[1] && /^&\s*Cell::/.test(args[1].text())) {
            edits.push(args[1].replace(args[1].text().slice(1)));
            continue;
        }

        if (calleeText.endsWith(".inner") && args[0] && /^&\s*Margin\b/.test(args[0].text())) {
            edits.push(args[0].replace(args[0].text().slice(1)));
            continue;
        }

        if (
            calleeText.endsWith(".track_symbol") &&
            args[0] &&
            /^["']/.test(args[0].text()) &&
            !args[0].text().startsWith("Some(")
        ) {
            edits.push(args[0].replace(`Some(${args[0].text()})`));
        }
    }

    for (const node of rootNode.findAll({ rule: { pattern: "Position::Bottom" } })) {
        edits.push(node.replace("TitlePosition::Bottom"));
    }

    for (const node of rootNode.findAll({ rule: { pattern: "Position::Top" } })) {
        edits.push(node.replace("TitlePosition::Top"));
    }

    for (const node of rootNode.findAll({ rule: { pattern: "symbols::line::Set" } })) {
        edits.push(node.replace("symbols::border::Set"));
    }

    for (const node of rootNode.findAll({ rule: { pattern: "Spans" } })) {
        edits.push(node.replace("Line"));
    }

    return applyEdits(rootNode, edits);
}

function ensureImport(source: string, importLine: string, matches: RegExp, existing: RegExp): string {
    if (!matches.test(source) || existing.test(source)) {
        return source;
    }

    const lines = source.split("\n");
    const insertAfter = lines.findIndex((line) => line.startsWith("use ratatui"));
    if (insertAfter === -1) {
        return `${importLine}\n${source}`;
    }

    lines.splice(insertAfter + 1, 0, importLine);
    return lines.join("\n");
}

function migrateRatatuiSource(source: string): string {
    let updated = rewriteUseStatements(source);
    updated = rewriteCallsAndIdentifiers(updated);
    updated = updated
        .replace(/\bframe\.size\(\)/g, "frame.area()")
        .replace(/\bterminal\.size\(\)/g, "terminal.area()")
        .replace(/Buffer::filled\(\s*([^,]+),\s*&\s*Cell::/g, "Buffer::filled($1, Cell::")
        .replace(/\bSpans::/g, "Line::")
        .replace(/\bSpans</g, "Line<")
        .replace(/\bSpans\b/g, "Line")
        .replace(/\bsymbols::line::Set\b/g, "symbols::border::Set");
    updated = ensureImport(
        updated,
        "use ratatui::widgets::TitlePosition;",
        /\bTitlePosition::/m,
        /^\s*use\s+ratatui::widgets::TitlePosition;$/m,
    );
    updated = updated.replace(
        /^(use\s+ratatui::text::Line;\n)(use\s+ratatui::text::Line;\n)+/m,
        "$1",
    );
    return updated;
}

const transform: Transform<Rust> = async (root: any) => {
    const source = root.root().text();

    if (!isLikelyRatatuiSource(source)) {
        return source;
    }

    return migrateRatatuiSource(source);
};

export default transform;
