import type { Edit, SgNode } from "codemod:ast-grep";

export function applyEdits<L>(rootNode: SgNode<L>, edits: Edit[]): string {
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

export function splitAliasedImport(text: string): { item: string; alias: string | null } {
    const match = text.match(/^(.*?)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)$/);
    if (!match) {
        return { item: text.trim(), alias: null };
    }
    return { item: match[1].trim(), alias: match[2] };
}

export function withAlias(path: string, alias: string | null): string {
    return alias ? `${path} as ${alias}` : path;
}
