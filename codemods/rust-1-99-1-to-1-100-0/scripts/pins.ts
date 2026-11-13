import type { Edit, SgNode } from "codemod:ast-grep";

export function updatePins(root: any, kind: "toolchain" | "cargo" | "clippy"): string | null {
    const tree = root.root() as SgNode;
    const edits: Edit[] = [];
    for (const pair of tree.findAll({ rule: { kind: "pair" } })) {
        const parent = pair.parent();
        const key = pair.children().find((child) => child.kind() === "bare_key");
        const value = pair.children().find((child) => child.kind() === "string");
        if (!key || !value || !parent) continue;
        const section = parent.kind() === "table" ? parent.text().split("\n", 1)[0] : "";
        const wanted = kind === "toolchain" ? key.text() === "channel" && /^\[\s*toolchain\s*\]/.test(section)
            : kind === "cargo" ? key.text() === "rust-version" && /^\[\s*(?:package|workspace\s*\.\s*package)\s*\]/.test(section)
            : key.text() === "msrv" && parent.kind() === "document";
        if (!wanted) continue;
        const text = value.text();
        if (text === '\"1.99.1\"' || text === "'1.99.1'") {
            edits.push(value.replace(`${text[0]}1.100.0${text[0]}`));
        }
    }
    return edits.length ? tree.commitEdits(edits) : null;
}
