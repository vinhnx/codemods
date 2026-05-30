import { parse } from "codemod:ast-grep";
import type { Edit, SgNode, Transform } from "codemod:ast-grep";
import type Rust from "codemod:ast-grep/langs/rust";
import { applyEdits } from "../../../shared/utils";

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

export function getSelector() {
    return {
        rule: {
            any: [
                { pattern: "use axum::$$$ITEMS" },
                { pattern: "use axum::{$$$ITEMS}" },
                { pattern: "$CALLEE.route($$$ARGS)" },
                { pattern: "$CALLEE.nest($$$ARGS)" },
                { pattern: "$CALLEE.route_service($$$ARGS)" },
                { pattern: "$CALLEE.nest_service($$$ARGS)" },
            ],
        },
    };
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

function rewriteAxumRouteCalls(source: string): string | null {
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

    if (edits.length === 0) {
        return null;
    }

    return applyEdits(rootNode, edits);
}

const transform: Transform<Rust> = async (root: any) => {
    const source = root.root().text();

    if (!/\baxum::|^\s*use\s+axum(?:::{1,2}|\s*[{;])/m.test(source)) {
        return null;
    }

    return rewriteAxumRouteCalls(source);
};

export default transform;
