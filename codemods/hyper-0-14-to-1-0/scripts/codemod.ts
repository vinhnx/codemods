import type { Transform } from "codemod:ast-grep";
import type Rust from "codemod:ast-grep/langs/rust";

function isLikelyHyperSource(source: string): boolean {
    return /\bhyper::|^\s*use\s+hyper(?:::{1,2}|\s*[{;])/m.test(source);
}

function isLikelyCargoToml(source: string): boolean {
    return /^\s*\[(?:package|workspace|dependencies|dev-dependencies|build-dependencies)/m.test(
        source,
    );
}

function migrateHyperCargoToml(source: string): string {
    let updated = source;

    updated = updated.replace(
        /^(\s*hyper\s*=\s*")0\.14(?:\.[0-9A-Za-z_.-]+)?("\s*)$/gm,
        "$11$2",
    );

    updated = updated.replace(
        /(\bhyper\s*=\s*\{[^\n}]*\bversion\s*=\s*")0\.14(?:\.[0-9A-Za-z_.-]+)?("[^\n}]*\})/g,
        "$11$2",
    );

    if (
        !/^\s*hyper-util\s*=/m.test(updated) &&
        /^\s*hyper\s*=/m.test(updated)
    ) {
        const insertedAfterPlain = updated.replace(
            /^(\s*hyper\s*=\s*"[^"]+"\s*)$/m,
            '$1\nhyper-util = { version = "0.1", features = ["client-legacy", "http1", "http2", "tokio"] }',
        );

        if (insertedAfterPlain !== updated) {
            return insertedAfterPlain;
        }

        updated = updated.replace(
            /^(\s*hyper\s*=\s*\{[^\n}]*\}\s*)$/m,
            '$1\nhyper-util = { version = "0.1", features = ["client-legacy", "http1", "http2", "tokio"] }',
        );
    }

    return updated;
}

function rewriteLegacyHyperUseStatements(source: string): string {
    source = source.replace(
        /^(\s*)use\s+hyper::Client(?:\s+as\s+([A-Za-z_][A-Za-z0-9_]*))?;\s*$/gm,
        (_, indent: string, alias?: string) =>
            `${indent}use hyper_util::client::legacy::Client${alias ? ` as ${alias}` : ""};`,
    );

    source = source.replace(
        /^(\s*)use\s+hyper::client::(?:connect::)?HttpConnector(?:\s+as\s+([A-Za-z_][A-Za-z0-9_]*))?;\s*$/gm,
        (_, indent: string, alias?: string) =>
            `${indent}use hyper_util::client::legacy::connect::HttpConnector${
                alias ? ` as ${alias}` : ""
            };`,
    );

    source = source.replace(
        /^(\s*)use\s+hyper::\{([^}]*)\};(\s*)$/gm,
        (_, indent: string, imports: string, trailing: string) => {
            const entries = imports
                .split(",")
                .map((entry) => entry.trim())
                .filter((entry) => entry.length > 0);

            const keep: string[] = [];
            const lifted: string[] = [];

            for (const entry of entries) {
                const clientMatch = entry.match(
                    /^Client(?:\s+as\s+([A-Za-z_][A-Za-z0-9_]*))?$/,
                );
                if (clientMatch) {
                    lifted.push(
                        `use hyper_util::client::legacy::Client${
                            clientMatch[1] ? ` as ${clientMatch[1]}` : ""
                        };`,
                    );
                    continue;
                }

                const connectorMatch = entry.match(
                    /^client::(?:connect::)?HttpConnector(?:\s+as\s+([A-Za-z_][A-Za-z0-9_]*))?$/,
                );
                if (connectorMatch) {
                    lifted.push(
                        `use hyper_util::client::legacy::connect::HttpConnector${
                            connectorMatch[1] ? ` as ${connectorMatch[1]}` : ""
                        };`,
                    );
                    continue;
                }

                keep.push(entry);
            }

            if (lifted.length === 0) {
                return `${indent}use hyper::{${entries.join(", ")}};${trailing}`;
            }

            const lines: string[] = [];
            if (keep.length > 0) {
                lines.push(`${indent}use hyper::{${keep.join(", ")}};`);
            }
            lines.push(...lifted.map((line) => `${indent}${line}`));

            return lines.join("\n") + trailing;
        },
    );

    return source;
}

function rewriteLegacyHyperTypePaths(source: string): string {
    source = source.replace(
        /\bhyper::Client\b/g,
        "hyper_util::client::legacy::Client",
    );
    source = source.replace(
        /\bhyper::client::(?:connect::)?HttpConnector\b/g,
        "hyper_util::client::legacy::connect::HttpConnector",
    );

    return source;
}

const transform: Transform<Rust> = async (root: any) => {
    const rootNode = root.root();
    let source = rootNode.text();

    if (isLikelyCargoToml(source)) {
        return migrateHyperCargoToml(source);
    }

    if (!isLikelyHyperSource(source)) {
        return source;
    }

    source = rewriteLegacyHyperUseStatements(source);
    source = rewriteLegacyHyperTypePaths(source);

    return source;
};

export default transform;
