import { parse } from "codemod:ast-grep";
import type { Edit, SgNode, Transform } from "codemod:ast-grep";
import type Rust from "codemod:ast-grep/langs/rust";

const ROUTE_METHOD_SUFFIXES = new Set([
    ".route",
    ".route_service",
    ".nest",
    ".nest_service",
    "::route",
    "::route_service",
    "::nest",
    "::nest_service",
]);

function isLikelyAxumSource(source: string): boolean {
    return /\baxum::|^\s*use\s+axum(?:::{1,2}|\s*[{;])/m.test(source);
}

function transformRoutePath(path: string): string {
    if (!path.startsWith("/")) {
        return path;
    }

    let rewritten = path.replace(/\/:([A-Za-z_][A-Za-z0-9_]*)/g, "/{$1}");
    rewritten = rewritten.replace(/\/\*([A-Za-z_][A-Za-z0-9_]*)/g, "/{*$1}");

    return rewritten;
}

function rewriteStringLiteral(literal: string): string | null {
    const normal = literal.match(/^"((?:[^"\\]|\\.)*)"$/s);
    if (normal) {
        const rewritten = transformRoutePath(normal[1]);
        return rewritten === normal[1] ? null : `"${rewritten}"`;
    }

    const raw = literal.match(/^r(#{0,10})"([\s\S]*)"\1$/);
    if (!raw) {
        return null;
    }

    const rewritten = transformRoutePath(raw[2]);
    return rewritten === raw[2] ? null : `r${raw[1]}"${rewritten}"${raw[1]}`;
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

function rewriteAxumRouteCalls(source: string): string {
    const parsed = parse("rust", source);
    const rootNode = parsed.root() as SgNode<Rust>;
    const edits: Edit[] = [];

    for (const call of rootNode.findAll({ rule: { pattern: "$CALLEE($$$ARGS)" } })) {
        const callee = call.getMatch("CALLEE");
        const args = call.getMultipleMatches("ARGS");

        if (!callee || args.length === 0) {
            continue;
        }

        if (![...ROUTE_METHOD_SUFFIXES].some((suffix) => callee.text().endsWith(suffix))) {
            continue;
        }

        const pathArg = args[0];
        const rewritten = rewriteStringLiteral(pathArg.text());
        if (rewritten && rewritten !== pathArg.text()) {
            edits.push(pathArg.replace(rewritten));
        }
    }

    return applyEdits(rootNode, edits);
}

const transform: Transform<Rust> = async (root: any) => {
    const source = root.root().text();

    if (!isLikelyAxumSource(source)) {
        return source;
    }

    return rewriteAxumRouteCalls(source);
};

export default transform;
