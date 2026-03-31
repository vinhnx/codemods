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

function formatReplacement(statement: SgNode<Rust>, lines: string[]): string {
    const indent = " ".repeat(statement.range().start.column);
    return lines
        .map((line, index) => (index === 0 ? line : `${indent}${line}`))
        .join("\n");
}

function splitAliasedImport(text: string): { item: string; alias: string | null } {
    const match = text.match(/^(.*?)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)$/);
    if (!match) {
        return { item: text.trim(), alias: null };
    }

    return { item: match[1].trim(), alias: match[2] };
}

function withAlias(path: string, alias: string | null): string {
    return alias ? `${path} as ${alias}` : path;
}

const SCROLLBAR_WIDGET_TYPES = new Set([
    "Scrollbar",
    "ScrollbarDirection",
    "ScrollbarOrientation",
]);

function rewriteUseStatements(source: string): string {
    const parsed = parse("rust", source);
    const rootNode = parsed.root() as SgNode<Rust>;
    const edits: Edit[] = [];

    for (const useStatement of rootNode.findAll({
        rule: { pattern: "use ratatui::terminal::{$$$ITEMS};" },
    })) {
        const items = useStatement
            .getMultipleMatches("ITEMS")
            .map((item) => item.text().trim())
            .filter((item) => item.length > 0);
        edits.push(useStatement.replace(`use ratatui::{${items.join(", ")}};`));
    }

    for (const useStatement of rootNode.findAll({
        rule: { pattern: "use ratatui::terminal::$ITEM;" },
    })) {
        const item = useStatement.getMatch("ITEM");
        if (!item) {
            continue;
        }

        edits.push(useStatement.replace(`use ratatui::${item.text()};`));
    }

    for (const useStatement of rootNode.findAll({
        rule: { pattern: "use ratatui::widgets::block::{$$$ITEMS};" },
    })) {
        const widgetItems: string[] = [];
        const extraLines: string[] = [];

        for (const itemNode of useStatement.getMultipleMatches("ITEMS")) {
            const { item, alias } = splitAliasedImport(itemNode.text());

            if (item === "Title") {
                extraLines.push(`use ${withAlias("ratatui::text::Line", alias)};`);
                continue;
            }

            if (item === "Position") {
                extraLines.push(`use ${withAlias("ratatui::widgets::TitlePosition", alias)};`);
                continue;
            }

            widgetItems.push(withAlias(`ratatui::widgets::${item}`, alias));
        }

        const lines: string[] = [];
        if (widgetItems.length === 1) {
            lines.push(`use ${widgetItems[0]};`);
        } else if (widgetItems.length > 1) {
            const items = widgetItems.map((item) => item.replace(/^ratatui::widgets::/, ""));
            lines.push(`use ratatui::widgets::{${items.join(", ")}};`);
        }
        lines.push(...extraLines);

        if (lines.length > 0) {
            edits.push(useStatement.replace(formatReplacement(useStatement, lines)));
        }
    }

    for (const useStatement of rootNode.findAll({
        rule: { pattern: "use ratatui::widgets::block::$ITEM;" },
    })) {
        const itemNode = useStatement.getMatch("ITEM");
        if (!itemNode) {
            continue;
        }

        const { item, alias } = splitAliasedImport(itemNode.text());

        if (item === "Title") {
            edits.push(useStatement.replace(`use ${withAlias("ratatui::text::Line", alias)};`));
            continue;
        }

        if (item === "Position") {
            edits.push(
                useStatement.replace(`use ${withAlias("ratatui::widgets::TitlePosition", alias)};`),
            );
            continue;
        }

        edits.push(useStatement.replace(`use ${withAlias(`ratatui::widgets::${item}`, alias)};`));
    }

    for (const useStatement of rootNode.findAll({
        rule: { pattern: "use ratatui::widgets::scrollbar::{$$$ITEMS};" },
    })) {
        const lines: string[] = [];

        for (const itemNode of useStatement.getMultipleMatches("ITEMS")) {
            const { item, alias } = splitAliasedImport(itemNode.text());

            if (item === "Set") {
                lines.push(`use ${withAlias("ratatui::symbols::scrollbar::Set", alias)};`);
                continue;
            }

            const path = SCROLLBAR_WIDGET_TYPES.has(item)
                ? `ratatui::widgets::${item}`
                : `ratatui::widgets::${item}`;
            lines.push(`use ${withAlias(path, alias)};`);
        }

        edits.push(useStatement.replace(formatReplacement(useStatement, lines)));
    }

    for (const useStatement of rootNode.findAll({
        rule: { pattern: "use ratatui::widgets::scrollbar::$ITEM;" },
    })) {
        const itemNode = useStatement.getMatch("ITEM");
        if (!itemNode) {
            continue;
        }

        const { item, alias } = splitAliasedImport(itemNode.text());
        if (item === "Set") {
            edits.push(
                useStatement.replace(`use ${withAlias("ratatui::symbols::scrollbar::Set", alias)};`),
            );
            continue;
        }

        edits.push(useStatement.replace(`use ${withAlias(`ratatui::widgets::${item}`, alias)};`));
    }

    for (const useStatement of rootNode.findAll({
        rule: { pattern: "use ratatui::text::Spans;" },
    })) {
        edits.push(useStatement.replace("use ratatui::text::Line;"));
    }

    for (const useStatement of rootNode.findAll({
        rule: { pattern: "use ratatui::text::{$$$ITEMS};" },
    })) {
        const items = useStatement
            .getMultipleMatches("ITEMS")
            .map((itemNode) => {
                const { item, alias } = splitAliasedImport(itemNode.text());
                if (item === "Spans") {
                    return withAlias("Line", alias);
                }
                return withAlias(item, alias);
            });

        if (items.some((item) => item.startsWith("Line"))) {
            edits.push(useStatement.replace(`use ratatui::text::{${items.join(", ")}};`));
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

function dedupeUseStatements(source: string): string {
    const parsed = parse("rust", source);
    const rootNode = parsed.root() as SgNode<Rust>;
    const edits: Edit[] = [];
    const seen = new Set<string>();

    for (const useStatement of rootNode.findAll({ rule: { pattern: "use $IMPORT;" } })) {
        const statement = useStatement.text();
        if (seen.has(statement)) {
            edits.push(useStatement.replace(""));
            continue;
        }

        seen.add(statement);
    }

    return applyEdits(rootNode, edits);
}

function migrateRatatuiSource(source: string): string {
    let updated = rewriteUseStatements(source);
    updated = rewriteCallsAndIdentifiers(updated);
    updated = dedupeUseStatements(updated);
    return updated.replace(/\n(\s*\n){2,}/g, "\n\n");
}

const transform: Transform<Rust> = async (root: any) => {
    const source = root.root().text();

    if (!isLikelyRatatuiSource(source)) {
        return source;
    }

    return migrateRatatuiSource(source);
};

export default transform;
