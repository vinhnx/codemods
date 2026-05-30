import { parse } from "codemod:ast-grep";
import type { Edit, SgNode, Transform } from "codemod:ast-grep";
import type Rust from "codemod:ast-grep/langs/rust";
import { applyEdits } from "../../../shared/utils";

export function getSelector() {
    return {
        rule: {
            any: [
                { pattern: "use rand::thread_rng" },
                { pattern: "use rand::{$$$ITEMS}" },
                { pattern: "$RECEIVER.gen($$$ARGS)" },
                { pattern: "$RECEIVER.gen_range($$$ARGS)" },
                { pattern: "$RECEIVER.gen_bool($$$ARGS)" },
                { pattern: "$RECEIVER.gen_ratio($$$ARGS)" },
                { pattern: "Rng::gen($$$ARGS)" },
                { pattern: "thread_rng()" },
            ],
        },
    };
}

function rewriteRandUseStatements(source: string): string {
    const parsed = parse("rust", source);
    const rootNode = parsed.root() as SgNode<Rust>;
    const edits: Edit[] = [];

    for (const useStatement of rootNode.findAll({ rule: { pattern: "use rand::thread_rng;" } })) {
        edits.push(useStatement.replace("use rand::rng;"));
    }

    for (const useStatement of rootNode.findAll({
        rule: { pattern: "use rand::thread_rng as $ALIAS;" },
    })) {
        const alias = useStatement.getMatch("ALIAS");
        if (!alias) {
            continue;
        }

        edits.push(useStatement.replace(`use rand::rng as ${alias.text()};`));
    }

    for (const useStatement of rootNode.findAll({ rule: { pattern: "use rand::{$$$ITEMS};" } })) {
        const items = useStatement
            .getMultipleMatches("ITEMS")
            .map((item) => item.text().trim())
            .filter((item) => item.length > 0 && item !== ",");

        let changed = false;
        const rewrittenItems = items.map((item) => {
            const match = item.match(/^thread_rng(?:\s+as\s+([A-Za-z_][A-Za-z0-9_]*))?$/);
            if (!match) {
                return item;
            }

            changed = true;
            return match[1] ? `rng as ${match[1]}` : "rng";
        });

        if (changed) {
            edits.push(useStatement.replace(`use rand::{${rewrittenItems.join(", ")}};`));
        }
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

    const RENAMED_METHOD_PATTERNS = [
        "$RECEIVER.$METHOD($$$ARGS)",
        "Rng::$METHOD($$$ARGS)",
        "rand::Rng::$METHOD($$$ARGS)",
    ];

    for (const pattern of RENAMED_METHOD_PATTERNS) {
        for (const call of rootNode.findAll({ rule: { pattern } })) {
            const method = call.getMatch("METHOD");
            if (!method) {
                continue;
            }

            const renamed = renameMethod(method.text());
            if (renamed) {
                edits.push(method.replace(renamed));
            }
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

    const GENERIC_PATTERNS = [
        "$RECEIVER.$METHOD::<$$$GENERIC_ARGS>($$$ARGS)",
        "Rng::$METHOD::<$$$GENERIC_ARGS>($$$ARGS)",
        "rand::Rng::$METHOD::<$$$GENERIC_ARGS>($$$ARGS)",
    ];

    for (const pattern of GENERIC_PATTERNS) {
        for (const call of rootNode.findAll({ rule: { pattern } })) {
            const method = call.getMatch("METHOD");
            if (method && method.text() === "gen") {
                edits.push(method.replace("random"));
            }
        }
    }

    return applyEdits(rootNode, edits);
}

const transform: Transform<Rust> = async (root: any) => {
    const source = root.root().text();

    if (!/\brand::|^\s*use\s+rand(?:::{1,2}|\s*[{;])/m.test(source)) {
        return null;
    }

    const withUpdatedImports = rewriteRandUseStatements(source);
    const result = rewriteRandCalls(withUpdatedImports);
    return result === source ? null : result;
};

export default transform;
