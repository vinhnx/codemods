import { parse } from "codemod:ast-grep";
import type { Edit, SgNode, Transform } from "codemod:ast-grep";
import type Rust from "codemod:ast-grep/langs/rust";

function isLikelyRandSource(source: string): boolean {
    return /\brand::|^\s*use\s+rand(?:::{1,2}|\s*[{;])/m.test(source);
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

function rewriteRandUseStatements(source: string): string {
    const parsed = parse("rust", source);
    const rootNode = parsed.root() as SgNode<Rust>;
    const edits: Edit[] = [];

    for (const useStatement of rootNode.findAll({ rule: { pattern: "use $IMPORT;" } })) {
        const statement = useStatement.text();

        if (/^use\s+rand::thread_rng(?:\s+as\s+\w+)?;$/.test(statement)) {
            edits.push(
                useStatement.replace(
                    statement.replace("rand::thread_rng", "rand::rng"),
                ),
            );
            continue;
        }

        if (!statement.startsWith("use rand::{")) {
            continue;
        }

        const entries = extractGroupedImports(statement);
        if (!entries) {
            continue;
        }

        let changed = false;
        const rewrittenEntries = entries.map((entry) => {
            const match = entry.match(/^thread_rng(?:\s+as\s+([A-Za-z_][A-Za-z0-9_]*))?$/);
            if (!match) {
                return entry;
            }

            changed = true;
            return match[1] ? `rng as ${match[1]}` : "rng";
        });

        if (!changed) {
            continue;
        }

        edits.push(useStatement.replace(`use rand::{${rewrittenEntries.join(", ")}};`));
    }

    return applyEdits(rootNode, edits);
}

const METHOD_RENAMES: Array<[string, string]> = [
    ["gen_range", "random_range"],
    ["gen_bool", "random_bool"],
    ["gen_ratio", "random_ratio"],
    ["gen", "random"],
];

function renameMethod(methodName: string): string | null {
    for (const [from, to] of METHOD_RENAMES) {
        if (methodName === from) {
            return to;
        }
    }

    return null;
}

function rewriteRandCalls(source: string): string {
    const parsed = parse("rust", source);
    const rootNode = parsed.root() as SgNode<Rust>;
    const edits: Edit[] = [];

    for (const call of rootNode.findAll({ rule: { pattern: "$RECEIVER.$METHOD($$$ARGS)" } })) {
        const method = call.getMatch("METHOD");
        if (!method) {
            continue;
        }

        const renamed = renameMethod(method.text());
        if (renamed) {
            edits.push(method.replace(renamed));
        }
    }

    for (const call of rootNode.findAll({ rule: { pattern: "Rng::$METHOD($$$ARGS)" } })) {
        const method = call.getMatch("METHOD");
        if (!method) {
            continue;
        }

        const renamed = renameMethod(method.text());
        if (renamed) {
            edits.push(method.replace(renamed));
        }
    }

    for (const call of rootNode.findAll({ rule: { pattern: "rand::Rng::$METHOD($$$ARGS)" } })) {
        const method = call.getMatch("METHOD");
        if (!method) {
            continue;
        }

        const renamed = renameMethod(method.text());
        if (renamed) {
            edits.push(method.replace(renamed));
        }
    }

    for (const call of rootNode.findAll({ rule: { pattern: "$CALLEE($$$ARGS)" } })) {
        const callee = call.getMatch("CALLEE");
        if (!callee) {
            continue;
        }

        if (callee.text() === "rand::thread_rng") {
            edits.push(callee.replace("rand::rng"));
            continue;
        }

        if (callee.text() === "thread_rng") {
            edits.push(callee.replace("rng"));
        }
    }

    for (const call of rootNode.findAll({ rule: { pattern: "$RECEIVER.$METHOD::<$$$GENERIC_ARGS>($$$ARGS)" } })) {
        const method = call.getMatch("METHOD");
        if (method && method.text() === "gen") {
            edits.push(method.replace("random"));
        }
    }

    for (const call of rootNode.findAll({ rule: { pattern: "Rng::$METHOD::<$$$GENERIC_ARGS>($$$ARGS)" } })) {
        const method = call.getMatch("METHOD");
        if (method && method.text() === "gen") {
            edits.push(method.replace("random"));
        }
    }

    for (const call of rootNode.findAll({ rule: { pattern: "rand::Rng::$METHOD::<$$$GENERIC_ARGS>($$$ARGS)" } })) {
        const method = call.getMatch("METHOD");
        if (method && method.text() === "gen") {
            edits.push(method.replace("random"));
        }
    }

    return applyEdits(rootNode, edits);
}

const transform: Transform<Rust> = async (root: any) => {
    const source = root.root().text();

    if (!isLikelyRandSource(source)) {
        return source;
    }

    const withUpdatedImports = rewriteRandUseStatements(source);
    return rewriteRandCalls(withUpdatedImports);
};

export default transform;
