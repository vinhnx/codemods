import type { Transform } from "codemod:ast-grep";
import type Rust from "codemod:ast-grep/langs/rust";

function replaceMethodNames(source: string): string {
    source = source.replace(
        /\.gen_range(?=\s*(?:::<[^>]*>)?\s*\()/g,
        ".random_range",
    );
    source = source.replace(
        /\.gen_bool(?=\s*(?:::<[^>]*>)?\s*\()/g,
        ".random_bool",
    );
    source = source.replace(
        /\.gen_ratio(?=\s*(?:::<[^>]*>)?\s*\()/g,
        ".random_ratio",
    );
    source = source.replace(/\.gen(?=\s*(?:::<[^>]*>)?\s*\()/g, ".random");

    source = source.replace(
        /\b(?:(rand::)?)Rng::gen_range(?=\s*(?:::<[^>]*>)?\s*\()/g,
        (_, prefix = "") => `${prefix}Rng::random_range`,
    );
    source = source.replace(
        /\b(?:(rand::)?)Rng::gen_bool(?=\s*(?:::<[^>]*>)?\s*\()/g,
        (_, prefix = "") => `${prefix}Rng::random_bool`,
    );
    source = source.replace(
        /\b(?:(rand::)?)Rng::gen_ratio(?=\s*(?:::<[^>]*>)?\s*\()/g,
        (_, prefix = "") => `${prefix}Rng::random_ratio`,
    );
    source = source.replace(
        /\b(?:(rand::)?)Rng::gen(?=\s*(?:::<[^>]*>)?\s*\()/g,
        (_, prefix = "") => `${prefix}Rng::random`,
    );

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

const transform: Transform<Rust> = async (root) => {
    const rootNode = root.root();
    let source = rootNode.text();

    source = replaceThreadRngImports(source);
    source = replaceThreadRngCalls(source);
    source = replaceMethodNames(source);

    return source;
};

export default transform;
