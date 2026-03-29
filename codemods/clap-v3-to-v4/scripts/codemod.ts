import type { Transform } from "codemod:ast-grep";
import type Rust from "codemod:ast-grep/langs/rust";

function isLikelyClapSource(source: string): boolean {
    return /\bclap::|^\s*use\s+clap(?:::{1,2}|\s*[{;])/m.test(source);
}

function isLikelyCargoToml(source: string): boolean {
    return /^\s*\[(?:package|workspace|dependencies|dev-dependencies|build-dependencies)/m.test(
        source,
    );
}

function migrateClapCargoToml(source: string): string {
    let updated = source;

    updated = updated.replace(
        /^(\s*clap\s*=\s*")3(?:\.[0-9A-Za-z_.-]+)?("\s*)$/gm,
        "$14$2",
    );

    updated = updated.replace(
        /(\bclap\s*=\s*\{[^\n}]*\bversion\s*=\s*")3(?:\.[0-9A-Za-z_.-]+)?("[^\n}]*\})/g,
        "$14$2",
    );

    return updated;
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

            // Skip duplicate arm body (handle multiline braces)
            let depth = 0;
            for (const ch of line) {
                if (ch === "{") depth++;
                if (ch === "}") depth--;
            }
            while (depth > 0 && i + 1 < lines.length) {
                i++; // skip next line
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

const transform: Transform<Rust> = async (root: any) => {
    const rootNode = root.root();
    let source = rootNode.text();

    if (isLikelyCargoToml(source)) {
        return migrateClapCargoToml(source);
    }

    if (!isLikelyClapSource(source)) {
        return source;
    }

    const appSettingsIdentifiers = getAppSettingsIdentifiers(source);

    // Build AppSettings removal regex from discovered identifiers
    const appSettingsRemovalPattern = appSettingsIdentifiers.length > 0
        ? new RegExp(
            `(?:\\n\\s*)?,?\\s*setting\\((?:${appSettingsIdentifiers.map(escapeRegExp).join("|")})::[^)]+\\)`,
            "g",
        )
        : null;

    function stripAppSettings(attrs: string): string {
        if (!appSettingsRemovalPattern) return attrs;
        return attrs.replace(appSettingsRemovalPattern, "");
    }

    // === Derive attribute renames (text-based for spacing preservation) ===

    // Field-level #[clap(...)] → #[arg(...)] (indented lines only, single-line attrs)
    source = source.replace(
        /^(\s+)#\[clap\(([^)]*)\)\]/gm,
        (_match: string, indent: string, attrs: string) => {
            let cleaned = stripAppSettings(attrs)
                .replace(/,\s*value_parser\b/g, "")
                .replace(/\bvalue_parser\s*,\s*/g, "")
                .replace(/,\s*action\b(?!\s*=)/g, "")
                .replace(/\baction\s*,\s*(?!=)/g, "");
            const trimmed = cleaned.trim();
            if (trimmed === "" || trimmed === "value_parser" || trimmed === "action") {
                return "";
            }
            // subcommand and long_about are command-level, not field-level
            if (/^subcommand$/.test(trimmed) || /^long_about\b/.test(trimmed)) {
                return `${indent}#[command(${cleaned})]`;
            }
            return `${indent}#[arg(${cleaned})]`;
        },
    );

    // Struct/enum-level #[clap(...)] → #[command(...)]
    // Handle multiline and nested parens by scanning with depth tracking
    let result = "";
    let pos = 0;
    while (pos < source.length) {
        const idx = source.indexOf("#[clap(", pos);
        if (idx === -1) {
            result += source.slice(pos);
            break;
        }

        // Check if preceded by whitespace (already handled as field-level)
        const lineStart = source.lastIndexOf("\n", idx) + 1;
        const isFieldLevel = idx > lineStart && /^\s/.test(source.slice(lineStart));

        if (isFieldLevel) {
            // Already handled by the field-level regex above — copy through
            result += source.slice(pos, idx + 7);
            pos = idx + 7;
            continue;
        }

        // Copy everything before this attribute
        result += source.slice(pos, idx);

        // Find matching closing paren
        let depth = 1;
        let i = idx + 7; // after "#[clap("
        while (i < source.length && depth > 0) {
            if (source[i] === "(") depth++;
            if (source[i] === ")") depth--;
            i++;
        }
        const inner = source.slice(idx + 7, i - 1);
        // Find the closing ']'
        const closeBracket = source.indexOf("]", i);
        const endPos = closeBracket !== -1 ? closeBracket + 1 : i;

        const cleaned = stripAppSettings(inner).trim();
        if (cleaned === "") {
            // Remove the attribute entirely (including leading newline)
            let skipStart = idx;
            if (skipStart > 0 && source[skipStart - 1] === "\n") {
                skipStart--;
                result = result.slice(0, -1); // remove trailing newline we already added
            }
            pos = endPos;
        } else {
            result += `#[command(${cleaned})]`;
            pos = endPos;
        }
    }
    source = result;

    // Clean up lines that became empty from removed attributes
    source = source.replace(/^\s*\n(?=\s*\n)/gm, "");

    // === Builder API method renames (text-based) ===

    // Methods that produce __codemod placeholders (collapsed later)
    for (const [method, placeholder] of [
        ["takes_value(true)", "__codemod_num_args_min(1)"],
        ["multiple_values(true)", "__codemod_num_args_min(1)"],
        ["multiple(true)", "__codemod_num_args_min(1)"],
    ]) {
        source = source.replace(
            new RegExp(`\\.${escapeRegExp(method)}`, "g"),
            `.${placeholder}`,
        );
    }

    for (const [method, placeholder] of [
        ["min_values", "__codemod_num_args_min"],
        ["max_values", "__codemod_num_args_max"],
        ["number_of_values", "__codemod_num_args_exact"],
    ]) {
        source = source.replace(
            new RegExp(`\\.${escapeRegExp(method)}\\((\\d+)\\)`, "g"),
            `.${placeholder}($1)`,
        );
    }

    // Methods to remove entirely (handle leading newline for line-removal)
    for (const method of ["takes_value(false)", "require_value_delimiter(true)"]) {
        const escaped = escapeRegExp(method);
        source = source.replace(new RegExp(`\\n\\s*\\.${escaped}`, "g"), "");
        source = source.replace(new RegExp(`\\.${escaped}`, "g"), "");
    }

    // Remove all .setting(AppSettings::...) calls and aliases imported from clap.
    for (const identifier of appSettingsIdentifiers) {
        const escapedIdentifier = escapeRegExp(identifier);
        const pattern = new RegExp(
            `\\n?\\s*\\.setting\\(${escapedIdentifier}::[^)]+\\)`,
            "g",
        );
        source = source.replace(pattern, "");
    }

    // Clean up: remove trailing whitespace on lines where methods were removed
    source = source.replace(/[ \t]+\n/g, "\n");
    // Clean up: remove lines that are now just whitespace after method removal
    source = source.replace(/\n(\s*\n){2,}/g, "\n\n");

    // === Error kind renames ===

    source = source.replace(
        /ErrorKind::EmptyValue/g,
        "ErrorKind::InvalidValue",
    );
    source = source.replace(
        /ErrorKind::UnrecognizedSubcommand/g,
        "ErrorKind::InvalidSubcommand",
    );

    // After renaming, remove duplicate match arms that resolve to the same variant.
    source = deduplicateErrorKindArms(source);

    // === ArgEnum / arg_enum → ValueEnum / value_enum ===

    source = source.replace(/\barg_enum\b/g, "value_enum");
    source = source.replace(/\bArgEnum\b/g, "ValueEnum");

    source = collapseNumArgsChains(source);
    source = cleanupClapImports(source);

    return source;
};

export default transform;
