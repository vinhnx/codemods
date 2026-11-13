import { parse } from "codemod:ast-grep";
import type { Edit, SgNode, Transform } from "codemod:ast-grep";
import type Rust from "codemod:ast-grep/langs/rust";

export function getSelector() {
    return { rule: { pattern: "if $COND { return true; }" } };
}

const transform: Transform<Rust> = async (root: any) => {
    const tree = parse("rust", root.root().text()).root() as SgNode<Rust>;
    const edits: Edit[] = [];
    for (const guard of tree.findAll(getSelector())) {
        const condition = guard.getMatch("COND");
        if (!condition || /\blet\b/.test(condition.text())) continue;
        let ancestor = guard.parent();
        let inMacro = false;
        while (ancestor) {
            if (ancestor.kind() === "macro_invocation") { inMacro = true; break; }
            ancestor = ancestor.parent();
        }
        if (inMacro) continue;
        const tail = guard.parent()?.kind() === "expression_statement" ? guard.parent() : guard;
        const fallback = tail?.next();
        if (!tail || !fallback || fallback.text() !== "false" || fallback.next()?.text() !== "}") continue;
        const block = tail.parent();
        if (!block || block.kind() !== "block" || block.parent()?.kind() !== "function_item") continue;
        const source = block.text();
        const guardStart = tail.range().start.index - block.range().start.index;
        const end = fallback.range().end.index - block.range().start.index;
        // Skip comments and attributes, including those between the two expressions.
        const trailing = Buffer.from(source).subarray(guardStart, end).toString();
        if (/\/\/|\/\*|#\s*\[/.test(trailing)) continue;
        edits.push({ startPos: tail.range().start.index, endPos: fallback.range().end.index, insertedText: condition.text() });
    }
    // Nested function items can yield overlapping edits; leave both for manual review.
    const safe = edits.filter((edit, index) => !edits.some((other, otherIndex) =>
        index !== otherIndex && edit.startPos < other.endPos && other.startPos < edit.endPos,
    ));
    return safe.length === 0 ? null : tree.commitEdits(safe);
};

export default transform;
