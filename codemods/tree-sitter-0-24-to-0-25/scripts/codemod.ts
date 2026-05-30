import { parse } from "codemod:ast-grep";
import type { Edit, SgNode, Transform } from "codemod:ast-grep";
import type Rust from "codemod:ast-grep/langs/rust";
import { applyEdits } from "../../../shared/utils";

export function getSelector() {
    return {
        rule: {
            any: [
                { pattern: "ts_node_child_containing_descendant" },
                { pattern: "$RECEIVER.child_containing_descendant($$$ARGS)" },
                { pattern: "Node::child_containing_descendant($$$ARGS)" },
            ],
        },
    };
}

function migrateRustSource(rootNode: SgNode<Rust>): string {
    const edits: Edit[] = [];

    for (const node of rootNode.findAll({
        rule: { pattern: "ts_node_child_containing_descendant" },
    })) {
        edits.push(node.replace("ts_node_child_with_descendant"));
    }

    for (const call of rootNode.findAll({ rule: { pattern: "$RECEIVER.$METHOD($$$ARGS)" } })) {
        const method = call.getMatch("METHOD");
        if (method?.text() === "child_containing_descendant") {
            edits.push(method.replace("child_with_descendant"));
        }
    }

    for (const call of rootNode.findAll({ rule: { pattern: "Node::$METHOD($$$ARGS)" } })) {
        const method = call.getMatch("METHOD");
        if (method?.text() === "child_containing_descendant") {
            edits.push(method.replace("child_with_descendant"));
        }
    }

    return applyEdits(rootNode, edits);
}

const transform: Transform<Rust> = async (root: any) => {
    const rootNode = root.root() as SgNode<Rust>;
    const source = rootNode.text();

    if (!/\btree_sitter::|^\s*use\s+tree_sitter(?:::{1,2}|\s*[{;])/m.test(source)) {
        return null;
    }

    const result = migrateRustSource(rootNode);
    return result === source ? null : result;
};

export default transform;
