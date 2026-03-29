import type { Transform } from "codemod:ast-grep";
import type Rust from "codemod:ast-grep/langs/rust";

function isLikelyRandSource(source: string): boolean {
    return /\brand::|^\s*use\s+rand(?:::{1,2}|\s*[{;])/m.test(source);
}

function isLikelyCargoToml(source: string): boolean {
    return /^\s*\[(?:package|workspace|dependencies|dev-dependencies|build-dependencies)/m.test(
        source,
    );
}

function migrateRandCargoToml(source: string): string {
    let updated = source;

    updated = updated.replace(
        /^(\s*rand\s*=\s*")0\.8(?:\.[0-9A-Za-z_.-]+)?("\s*)$/gm,
        "$10.9$2",
    );

    updated = updated.replace(
        /(\brand\s*=\s*\{[^\n}]*\bversion\s*=\s*")0\.8(?:\.[0-9A-Za-z_.-]+)?("[^\n}]*\})/g,
        "$10.9$2",
    );

    return updated;
}

const METHOD_LOOKAHEAD = "(?=\\s*(?:::<[^>]*>)?\\s*\\()";

const RENAMES: [string, string][] = [
    ["gen_range", "random_range"],
    ["gen_bool", "random_bool"],
    ["gen_ratio", "random_ratio"],
    ["gen", "random"],
];

function replaceMethodNames(source: string): string {
    for (const [old, new_] of RENAMES) {
        // Method-call syntax: .gen() → .random()
        source = source.replace(
            new RegExp(`\\.${old}${METHOD_LOOKAHEAD}`, "g"),
            `.${new_}`,
        );
        // UFCS syntax: Rng::gen() → Rng::random()
        source = source.replace(
            new RegExp(`\\b(?:(rand::)?)Rng::${old}${METHOD_LOOKAHEAD}`, "g"),
            (_, prefix = "") => `${prefix}Rng::${new_}`,
        );
    }
    return source;
}

function replaceThreadRngImports(source: string): string {
    source = source.replace(
        /^\s*use\s+rand::thread_rng(?:\s+as\s+([A-Za-z_][A-Za-z0-9_]*))?;\s*$/gm,
        (_, alias?: string) =>
            alias ? `use rand::rng as ${alias};` : "use rand::rng;",
    );

    source = source.replace(
        /use\s+rand::\{([^}]*)\};/g,
        (statement, imports) => {
            const entries = imports
                .split(",")
                .map((entry: string) => entry.trim())
                .filter((entry: string) => entry.length > 0);

            let changed = false;
            const rewrittenEntries = entries.map((entry: string) => {
                const match = entry.match(
                    /^thread_rng(?:\s+as\s+([A-Za-z_][A-Za-z0-9_]*))?$/,
                );
                if (!match) {
                    return entry;
                }

                changed = true;
                return match[1] ? `rng as ${match[1]}` : "rng";
            });

            if (!changed) {
                return statement;
            }

            return `use rand::{${rewrittenEntries.join(", ")}};`;
        },
    );

    return source;
}

function replaceThreadRngCalls(source: string): string {
    source = source.replace(/\brand::thread_rng\s*\(/g, "rand::rng(");
    source = source.replace(/\bthread_rng\s*\(/g, "rng(");
    return source;
}

const transform: Transform<Rust> = async (root: any) => {
    const rootNode = root.root();
    let source = rootNode.text();

    if (isLikelyCargoToml(source)) {
        return migrateRandCargoToml(source);
    }

    if (!isLikelyRandSource(source)) {
        return source;
    }

    source = replaceThreadRngImports(source);
    source = replaceThreadRngCalls(source);
    source = replaceMethodNames(source);

    return source;
};

export default transform;
