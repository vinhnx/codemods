import { parse } from "codemod:ast-grep";
import type { Edit, SgNode, Transform } from "codemod:ast-grep";
import type Rust from "codemod:ast-grep/langs/rust";

function isLikelyClapSource(source: string): boolean {
    return /\bclap::|^\s*use\s+clap(?:::{1,2}|\s*[{;])/m.test(source);
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitAliasedImport(text: string): { item: string; alias: string | null } {
    const match = text.match(/^(.*?)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)$/);
    if (!match) {
        return { item: text.trim(), alias: null };
    }

    return { item: match[1].trim(), alias: match[2] };
}

function collectAppSettingsIdentifiers(source: string): string[] {
    const parsed = parse("rust", source);
    const rootNode = parsed.root() as SgNode<Rust>;
    const identifiers = new Set<string>(["AppSettings", "clap::AppSettings"]);

    for (const useStatement of rootNode.findAll({ rule: { pattern: "use clap::AppSettings;" } })) {
        identifiers.add("AppSettings");
    }

    for (const useStatement of rootNode.findAll({
        rule: { pattern: "use clap::AppSettings as $ALIAS;" },
    })) {
        const alias = useStatement.getMatch("ALIAS");
        if (alias) {
            identifiers.add(alias.text());
        }
    }

    for (const useStatement of rootNode.findAll({ rule: { pattern: "use clap::{$$$ITEMS};" } })) {
        for (const itemNode of useStatement.getMultipleMatches("ITEMS")) {
            const { item, alias } = splitAliasedImport(itemNode.text());
            if (item === "AppSettings") {
                identifiers.add(alias ?? "AppSettings");
            }
        }
    }

    return [...identifiers];
}

function parseNumArgsExpression(line: string): {
    kind: "exact" | "range";
    lower: number;
    upper?: number;
} | null {
    const match = line.match(/\.num_args\(([^)]+)\)/);
    if (!match) {
        return null;
    }

    const value = match[1].trim();

    if (/^\d+$/.test(value)) {
        return { kind: "exact", lower: Number(value) };
    }

    const ranged = value.match(/^(\d+)\.\.(?:=(\d+))?$/);
    if (!ranged) {
        return null;
    }

    const lower = Number(ranged[1]);
    const upper = ranged[2] ? Number(ranged[2]) : undefined;

    return { kind: "range", lower, upper };
}

function parseNumArgsPlaceholder(line: string): {
    kind: "exact" | "min" | "max";
    value: number;
} | null {
    const exact = line.match(/\.__codemod_num_args_exact\((\d+)\)/);
    if (exact) {
        return { kind: "exact", value: Number(exact[1]) };
    }

    const min = line.match(/\.__codemod_num_args_min\((\d+)\)/);
    if (min) {
        return { kind: "min", value: Number(min[1]) };
    }

    const max = line.match(/\.__codemod_num_args_max\((\d+)\)/);
    if (max) {
        return { kind: "max", value: Number(max[1]) };
    }

    return null;
}

function formatNumArgsExpression(lower: number, upper?: number): string {
    if (upper === undefined) {
        return `${lower}..`;
    }

    if (lower === upper) {
        return `${lower}`;
    }

    return `${lower}..=${upper}`;
}

function collapseNumArgsChain(chain: string): string {
    const lines = chain.split("\n");
    const cardinalityLines: Array<{ index: number; line: string }> = [];
    let sawPlaceholder = false;
    let exactValue: number | undefined;
    let lowerBound: number | undefined;
    let upperBound: number | undefined;

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const placeholder = parseNumArgsPlaceholder(line);
        if (!placeholder && !line.includes(".num_args(")) {
            continue;
        }

        cardinalityLines.push({ index, line });

        if (placeholder) {
            sawPlaceholder = true;
            if (placeholder.kind === "exact") {
                exactValue = placeholder.value;
                continue;
            }

            if (placeholder.kind === "min") {
                lowerBound =
                    lowerBound === undefined
                        ? placeholder.value
                        : Math.max(lowerBound, placeholder.value);
                continue;
            }

            upperBound =
                upperBound === undefined
                    ? placeholder.value
                    : Math.min(upperBound, placeholder.value);
            continue;
        }

        const parsed = parseNumArgsExpression(line);
        if (!parsed) {
            continue;
        }

        if (parsed.kind === "exact") {
            exactValue = parsed.lower;
            continue;
        }

        lowerBound =
            lowerBound === undefined
                ? parsed.lower
                : Math.max(lowerBound, parsed.lower);

        if (parsed.upper !== undefined) {
            upperBound =
                upperBound === undefined
                    ? parsed.upper
                    : Math.min(upperBound, parsed.upper);
        }
    }

    if (cardinalityLines.length === 0) {
        return chain;
    }

    if (lowerBound === undefined && upperBound !== undefined) {
        lowerBound = 1;
    }

    if (cardinalityLines.length === 1 && !sawPlaceholder) {
        return chain;
    }

    const lastNumArgsIndex = cardinalityLines[cardinalityLines.length - 1].index;

    let replacement = cardinalityLines[cardinalityLines.length - 1].line;
    if (exactValue !== undefined) {
        replacement = replacement.replace(
            /\.(?:num_args|__codemod_num_args_exact|__codemod_num_args_min|__codemod_num_args_max)\([^)]+\)/,
            `.num_args(${exactValue})`,
        );
    } else if (lowerBound !== undefined) {
        replacement = replacement.replace(
            /\.(?:num_args|__codemod_num_args_exact|__codemod_num_args_min|__codemod_num_args_max)\([^)]+\)/,
            `.num_args(${formatNumArgsExpression(lowerBound, upperBound)})`,
        );
    }

    const rebuiltLines: string[] = [];
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const hasCardinalityCall =
            line.includes(".num_args(") ||
            line.includes(".__codemod_num_args_exact(") ||
            line.includes(".__codemod_num_args_min(") ||
            line.includes(".__codemod_num_args_max(");

        if (!hasCardinalityCall) {
            rebuiltLines.push(line);
            continue;
        }

        if (index === lastNumArgsIndex) {
            rebuiltLines.push(replacement);
        }
    }

    return rebuiltLines.join("\n");
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

function createAppSettingsRemovalPattern(appSettingsIdentifiers: string[]): RegExp | null {
    if (appSettingsIdentifiers.length === 0) {
        return null;
    }

    const references = [...new Set(appSettingsIdentifiers.map(escapeRegExp))];
    const joined = references.join("|");

    return new RegExp(
        `(?:\\n\\s*)?,?\\s*setting\\((?:${joined})::[^)]+\\)` +
        `|,\\s*\\bsetting\\s*=\\s*(?:${joined})::\\w+` +
        `|\\bsetting\\s*=\\s*(?:${joined})::\\w+\\s*,?`,
        "g",
    );
}

function stripAppSettings(attrs: string, removalPattern: RegExp | null): string {
    if (!removalPattern) {
        return attrs;
    }

    return attrs.replace(removalPattern, "");
}

function cleanClapAttributeArgs(attrs: string, removalPattern: RegExp | null): string {
    return stripAppSettings(attrs, removalPattern)
        .replace(/,\s*value_parser\b/g, "")
        .replace(/\bvalue_parser\s*,\s*/g, "")
        .replace(/,\s*action\b(?!\s*=)/g, "")
        .replace(/\baction\s*,\s*(?!=)/g, "")
        .replace(/,\s*\btakes_value\s*=\s*(?:true|false)\b/g, "")
        .replace(/\btakes_value\s*=\s*(?:true|false)\b\s*,?\s*/g, "");
}

function isFieldLikeClapAttribute(attribute: SgNode<Rust>): boolean {
    return attribute.inside({ rule: { kind: "field_declaration" } });
}

function rewriteClapAttributes(source: string, removalPattern: RegExp | null): string {
    const parsed = parse("rust", source);
    const rootNode = parsed.root() as SgNode<Rust>;
    const edits: Edit[] = [];

    for (const attribute of rootNode.findAll({ rule: { pattern: "#[clap($$$ARGS)]" } })) {
        const text = attribute.text();
        const inner = text.slice("#[clap(".length, -2);
        const cleaned = cleanClapAttributeArgs(inner, removalPattern).trim();

        if (isFieldLikeClapAttribute(attribute)) {
            const target = cleaned === "subcommand" ? "command" : "arg";
            edits.push(attribute.replace(`#[${target}(${cleaned})]`));
            continue;
        }

        edits.push(attribute.replace(cleaned === "" ? "" : `#[command(${cleaned})]`));
    }

    return applyEdits(rootNode, edits);
}

const PLACEHOLDER_METHODS: Record<string, string> = {
    takes_value: "__codemod_num_args_min",
    multiple_values: "__codemod_num_args_min",
    multiple: "__codemod_num_args_min",
    min_values: "__codemod_num_args_min",
    max_values: "__codemod_num_args_max",
    number_of_values: "__codemod_num_args_exact",
};

const CARDINALITY_METHODS = new Set(["num_args", ...Object.keys(PLACEHOLDER_METHODS)]);

function isAppSettingsReference(text: string, appSettingsIdentifiers: string[]): boolean {
    return appSettingsIdentifiers.some((identifier) => text.startsWith(`${identifier}::`));
}

function rewriteBuilderCalls(source: string, appSettingsIdentifiers: string[]): string {
    const parsed = parse("rust", source);
    const rootNode = parsed.root() as SgNode<Rust>;
    const edits: Edit[] = [];

    for (const call of rootNode.findAll({ rule: { pattern: "$RECEIVER.$METHOD($$$ARGS)" } })) {
        const receiver = call.getMatch("RECEIVER");
        const method = call.getMatch("METHOD");
        const args = call.getMultipleMatches("ARGS");
        if (!receiver || !method || args.length === 0) {
            continue;
        }

        const methodName = method.text();
        if (
            methodName === "setting" &&
            args.length === 1 &&
            isAppSettingsReference(args[0].text(), appSettingsIdentifiers)
        ) {
            edits.push(call.replace(receiver.text()));
            continue;
        }

        if (methodName === "takes_value" && args[0].text() === "false") {
            edits.push(call.replace(receiver.text()));
            continue;
        }

        if (methodName === "require_value_delimiter" && args[0].text() === "true") {
            edits.push(call.replace(receiver.text()));
            continue;
        }

        if (!(methodName in PLACEHOLDER_METHODS)) {
            continue;
        }

        if (
            (methodName === "takes_value" ||
                methodName === "multiple_values" ||
                methodName === "multiple") &&
            args[0].text() !== "true"
        ) {
            continue;
        }

        edits.push(method.replace(PLACEHOLDER_METHODS[methodName]));
        if (
            (methodName === "takes_value" ||
                methodName === "multiple_values" ||
                methodName === "multiple") &&
            args[0].text() === "true"
        ) {
            edits.push(args[0].replace("1"));
        }
    }

    return applyEdits(rootNode, edits);
}

function containsNode(outer: SgNode<Rust>, inner: SgNode<Rust>): boolean {
    return (
        outer.range().start.index <= inner.range().start.index &&
        outer.range().end.index >= inner.range().end.index
    );
}

function findOutermostReceiverChain(call: SgNode<Rust>): SgNode<Rust> {
    let target = call;

    for (const ancestor of call.ancestors()) {
        if (!ancestor.matches({ rule: { pattern: "$RECEIVER.$METHOD($$$ARGS)" } })) {
            continue;
        }

        const receiver = ancestor.getMatch("RECEIVER");
        if (receiver && containsNode(receiver as SgNode<Rust>, target)) {
            target = ancestor as SgNode<Rust>;
        }
    }

    return target;
}

function normalizeNumArgsChains(source: string): string {
    const parsed = parse("rust", source);
    const rootNode = parsed.root() as SgNode<Rust>;
    const edits: Edit[] = [];
    const seen = new Set<string>();

    for (const call of rootNode.findAll({ rule: { pattern: "$RECEIVER.$METHOD($$$ARGS)" } })) {
        const method = call.getMatch("METHOD");
        if (!method || !CARDINALITY_METHODS.has(method.text())) {
            continue;
        }

        const chain = findOutermostReceiverChain(call as SgNode<Rust>);
        const key = `${chain.range().start.index}:${chain.range().end.index}`;
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);

        const collapsed = collapseNumArgsChain(chain.text());
        if (collapsed !== chain.text()) {
            edits.push(chain.replace(collapsed));
        }
    }

    return applyEdits(rootNode, edits);
}

function deduplicateErrorKindVariant(source: string, variant: string): string {
    const pattern = new RegExp(`^\\s*(?:(?:clap::)?)ErrorKind::${variant}\\s*=>`);
    const lines = source.split("\n");
    const result: string[] = [];
    let seen = false;

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];

        if (!pattern.test(line)) {
            result.push(line);
            continue;
        }

        if (!seen) {
            seen = true;
            result.push(line);
            continue;
        }

        let depth = 0;
        for (const ch of line) {
            if (ch === "{") depth += 1;
            if (ch === "}") depth -= 1;
        }

        while (depth > 0 && index + 1 < lines.length) {
            index += 1;
            for (const ch of lines[index]) {
                if (ch === "{") depth += 1;
                if (ch === "}") depth -= 1;
            }
        }
    }

    return result.join("\n");
}

function deduplicateErrorKindMatches(source: string): string {
    const parsed = parse("rust", source);
    const rootNode = parsed.root() as SgNode<Rust>;
    const edits: Edit[] = [];

    for (const matchExpression of rootNode.findAll({ rule: { kind: "match_expression" } })) {
        let rewritten = matchExpression.text();
        rewritten = deduplicateErrorKindVariant(rewritten, "InvalidValue");
        rewritten = deduplicateErrorKindVariant(rewritten, "InvalidSubcommand");

        if (rewritten !== matchExpression.text()) {
            edits.push(matchExpression.replace(rewritten));
        }
    }

    return applyEdits(rootNode, edits);
}

function rewriteClapImports(source: string): string {
    const parsed = parse("rust", source);
    const rootNode = parsed.root() as SgNode<Rust>;
    const edits: Edit[] = [];

    for (const useStatement of rootNode.findAll({ rule: { pattern: "use clap::AppSettings;" } })) {
        edits.push(useStatement.replace(""));
    }

    for (const useStatement of rootNode.findAll({
        rule: { pattern: "use clap::AppSettings as $ALIAS;" },
    })) {
        edits.push(useStatement.replace(""));
    }

    for (const useStatement of rootNode.findAll({ rule: { pattern: "use clap::{$$$ITEMS};" } })) {
        const items = useStatement
            .getMultipleMatches("ITEMS")
            .map((itemNode) => itemNode.text().trim())
            .filter((item) => item.length > 0);
        const kept = items.filter(
            (item) => splitAliasedImport(item).item !== "AppSettings",
        );

        if (kept.length !== items.length) {
            edits.push(
                useStatement.replace(
                    kept.length === 0 ? "" : `use clap::{${kept.join(", ")}};`,
                ),
            );
        }
    }

    return applyEdits(rootNode, edits);
}

function rewriteExactPatterns(source: string): string {
    const parsed = parse("rust", source);
    const rootNode = parsed.root() as SgNode<Rust>;
    const edits: Edit[] = [];

    for (const node of rootNode.findAll({ rule: { pattern: "ErrorKind::EmptyValue" } })) {
        edits.push(node.replace("ErrorKind::InvalidValue"));
    }

    for (const node of rootNode.findAll({
        rule: { pattern: "ErrorKind::UnrecognizedSubcommand" },
    })) {
        edits.push(node.replace("ErrorKind::InvalidSubcommand"));
    }

    for (const node of rootNode.findAll({ rule: { pattern: "ArgEnum" } })) {
        edits.push(node.replace("ValueEnum"));
    }

    for (const node of rootNode.findAll({ rule: { pattern: "arg_enum" } })) {
        edits.push(node.replace("value_enum"));
    }

    return applyEdits(rootNode, edits);
}

function normalizeFormatting(source: string): string {
    return source
        .replace(/^\s*\n/, "")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n\s*\n(\s*\.[A-Za-z_][A-Za-z0-9_]*\()/g, "\n$1")
        .replace(
            /(\n\s*#\[[^\n]+\])\n\s*\n(\s*(?:pub\s+)?(?:struct|enum)\b)/g,
            "$1\n$2",
        )
        .replace(/^\s*\n(?=\s*\n)/gm, "");
}

const transform: Transform<Rust> = async (root: any) => {
    let source = root.root().text();

    if (!isLikelyClapSource(source)) {
        return source;
    }

    const appSettingsIdentifiers = collectAppSettingsIdentifiers(source);
    const appSettingsRemovalPattern = createAppSettingsRemovalPattern(appSettingsIdentifiers);

    source = rewriteClapAttributes(source, appSettingsRemovalPattern);
    source = rewriteBuilderCalls(source, appSettingsIdentifiers);
    source = rewriteExactPatterns(source);
    source = normalizeNumArgsChains(source);
    source = deduplicateErrorKindMatches(source);
    source = rewriteClapImports(source);
    source = normalizeFormatting(source);

    return source;
};

export default transform;
