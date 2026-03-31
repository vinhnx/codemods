import type { Edit, SgNode, Transform } from "codemod:ast-grep";
import type Rust from "codemod:ast-grep/langs/rust";

function isLikelyTreeSitterSource(source: string): boolean {
    return /\btree_sitter::|^\s*use\s+tree_sitter(?:::{1,2}|\s*[{;])/m.test(source);
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

    if (!isLikelyTreeSitterSource(source)) {
        return source;
    }

    return migrateRustSource(rootNode);
};

export default transform;
