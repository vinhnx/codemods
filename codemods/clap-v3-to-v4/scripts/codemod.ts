import { parse } from "codemod:ast-grep";
import type { Edit, SgNode, Transform } from "codemod:ast-grep";
import type Rust from "codemod:ast-grep/langs/rust";

function isLikelyClapSource(source: string): boolean {
    return /\bclap::|^\s*use\s+clap(?:::{1,2}|\s*[{;])/m.test(source);
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getAppSettingsIdentifiers(source: string): string[] {
    const identifiers = new Set<string>();

    const directImportPattern =
        /use\s+clap::AppSettings(?:\s+as\s+([A-Za-z_][A-Za-z0-9_]*))?;/g;

    for (const match of source.matchAll(directImportPattern)) {
        identifiers.add(match[1] ?? "AppSettings");
    }

    const groupedImportPattern = /use\s+clap::\{([^}]*)\};/g;
    for (const match of source.matchAll(groupedImportPattern)) {
        const imports = match[1]
            .split(",")
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0);

        for (const entry of imports) {
            const appSettingsMatch = entry.match(
                /^AppSettings(?:\s+as\s+([A-Za-z_][A-Za-z0-9_]*))?$/,
            );

            if (appSettingsMatch) {
                identifiers.add(appSettingsMatch[1] ?? "AppSettings");
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

function deduplicateErrorKindArms(source: string): string {
    for (const variant of ["InvalidValue", "InvalidSubcommand"]) {
        const pattern = new RegExp(
            `^\\s*(?:(?:clap::)?)ErrorKind::${variant}\\s*=>`,
        );
        const lines = source.split("\n");
        const result: string[] = [];
        let seen = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

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
                if (ch === "{") depth++;
                if (ch === "}") depth--;
            }
            while (depth > 0 && i + 1 < lines.length) {
                i++;
                for (const ch of lines[i]) {
                    if (ch === "{") depth++;
                    if (ch === "}") depth--;
                }
            }
        }

        source = result.join("\n");
    }
    return source;
}

function collapseNumArgsChains(source: string): string {
    return source.replace(
        /((?:\n[ \t]*\.[A-Za-z_][A-Za-z0-9_]*\([^()\n]*\))+)/g,
        (chain) => {
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

            const lastNumArgsIndex =
                cardinalityLines[cardinalityLines.length - 1].index;

            let replacement =
                cardinalityLines[cardinalityLines.length - 1].line;
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
        },
    );
}

function cleanupClapImports(source: string): string {
    const cleanedBraceImports = source.replace(
        /use\s+clap::\{([^}]*)\};/g,
        (statement, imports) => {
            if (!imports.includes("AppSettings")) {
                return statement;
            }

            const cleanedImports = imports
                .split(",")
                .map((entry: string) => entry.trim())
                .filter(
                    (entry: string) =>
                        entry.length > 0 &&
                        !/^AppSettings(?:\s+as\s+\w+)?$/.test(entry),
                );

            if (cleanedImports.length === 0) {
                return "";
            }

            return `use clap::{${cleanedImports.join(", ")}};`;
        },
    );

    return cleanedBraceImports
        .replace(/^\s*use\s+clap::AppSettings(?:\s+as\s+\w+)?;\s*\n?/gm, "")
        .replace(/\n{3,}/g, "\n\n");
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

    return new RegExp(
        `(?:\\n\\s*)?,?\\s*setting\\((?:${appSettingsIdentifiers.map(escapeRegExp).join("|")})::[^)]+\\)` +
        `|,\\s*\\bsetting\\s*=\\s*(?:${appSettingsIdentifiers.map(escapeRegExp).join("|")})::\\w+` +
        `|\\bsetting\\s*=\\s*(?:${appSettingsIdentifiers.map(escapeRegExp).join("|")})::\\w+\\s*,?`,
        "g",
    );
}

function stripAppSettings(attrs: string, removalPattern: RegExp | null): string {
    if (!removalPattern) {
        return attrs;
    }

    return attrs.replace(removalPattern, "");
}

function rewriteClapAttributes(source: string, removalPattern: RegExp | null): string {
    const parsed = parse("rust", source);
    const rootNode = parsed.root() as SgNode<Rust>;
    const edits: Edit[] = [];

    for (const attribute of rootNode.findAll({ rule: { pattern: "#[clap($$$ARGS)]" } })) {
        const text = attribute.text();
        const inner = text.slice("#[clap(".length, -2);
        const isIndentedAttribute = attribute.range().start.column > 0;

        if (isIndentedAttribute) {
            let cleaned = stripAppSettings(inner, removalPattern)
                .replace(/,\s*value_parser\b/g, "")
                .replace(/\bvalue_parser\s*,\s*/g, "")
                .replace(/,\s*action\b(?!\s*=)/g, "")
                .replace(/\baction\s*,\s*(?!=)/g, "");

            const trimmed = cleaned.trim();
            if (trimmed === "" || trimmed === "value_parser" || trimmed === "action") {
                edits.push(attribute.replace(""));
                continue;
            }

            const replacement = /^subcommand$/.test(trimmed) || /^long_about\b/.test(trimmed)
                ? `#[command(${trimmed})]`
                : `#[arg(${trimmed})]`;
            edits.push(attribute.replace(replacement));
            continue;
        }

        const cleaned = stripAppSettings(inner, removalPattern).trim();
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

function rewriteBuilderMethods(source: string): string {
    const parsed = parse("rust", source);
    const rootNode = parsed.root() as SgNode<Rust>;
    const edits: Edit[] = [];

    for (const call of rootNode.findAll({ rule: { pattern: "$RECEIVER.$METHOD($$$ARGS)" } })) {
        const method = call.getMatch("METHOD");
        const args = call.getMultipleMatches("ARGS");
        if (!method || args.length === 0) {
            continue;
        }

        const methodName = method.text();
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

const transform: Transform<Rust> = async (root: any) => {
    let source = root.root().text();

    if (!isLikelyClapSource(source)) {
        return source;
    }

    const appSettingsIdentifiers = getAppSettingsIdentifiers(source);
    const appSettingsRemovalPattern = createAppSettingsRemovalPattern(appSettingsIdentifiers);

    source = rewriteClapAttributes(source, appSettingsRemovalPattern);
    source = source.replace(/^\s*\n(?=\s*\n)/gm, "");

    source = rewriteBuilderMethods(source);
    source = rewriteExactPatterns(source);

    source = source.replace(/,\s*\btakes_value\s*=\s*(?:true|false)\b/g, "");
    source = source.replace(/\btakes_value\s*=\s*(?:true|false)\b\s*,?\s*/g, "");

    for (const method of ["takes_value(false)", "require_value_delimiter(true)"]) {
        const escaped = escapeRegExp(method);
        source = source.replace(new RegExp(`\\n\\s*\\.${escaped}`, "g"), "");
        source = source.replace(new RegExp(`\\.${escaped}`, "g"), "");
    }

    for (const identifier of appSettingsIdentifiers) {
        const escapedIdentifier = escapeRegExp(identifier);
        const pattern = new RegExp(
            `\\n?\\s*\\.setting\\(${escapedIdentifier}::[^)]+\\)`,
            "g",
        );
        source = source.replace(pattern, "");
    }

    source = source.replace(/[ \t]+\n/g, "\n");
    source = source.replace(/\n(\s*\n){2,}/g, "\n\n");

    source = deduplicateErrorKindArms(source);
    source = collapseNumArgsChains(source);
    source = cleanupClapImports(source);

    return source;
};

export default transform;
