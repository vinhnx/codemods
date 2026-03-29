import type { Transform } from "codemod:ast-grep";
import type Rust from "codemod:ast-grep/langs/rust";

function isLikelyTreeSitterSource(source: string): boolean {
    return /\btree_sitter::|^\s*use\s+tree_sitter(?:::{1,2}|\s*[{;])/m.test(source);
}

function isLikelyCargoToml(source: string): boolean {
    return /^\s*\[(?:package|workspace|dependencies|dev-dependencies|build-dependencies)/m.test(
        source,
    );
}

function migrateTreeSitterCargoToml(source: string): string {
    let updated = source;

    // Simple string dep: tree-sitter = "0.24.x"
    updated = updated.replace(
        /^(\s*tree-sitter\s*=\s*")0\.24(?:\.[0-9A-Za-z_.-]+)?("\s*)$/gm,
        "$10.25$2",
    );

    // Inline table dep: tree-sitter = { version = "0.24.x", ... }
    updated = updated.replace(
        /(\btree-sitter\s*=\s*\{[^\n}]*\bversion\s*=\s*")0\.24(?:\.[0-9A-Za-z_.-]+)?("[^\n}]*\})/g,
        "$10.25$2",
    );

    // tree-sitter-language simple string dep
    updated = updated.replace(
        /^(\s*tree-sitter-language\s*=\s*")0\.\d+(?:\.[0-9A-Za-z_.-]+)?("\s*)$/gm,
        "$10.1$2",
    );

    // tree-sitter-language inline table dep
    updated = updated.replace(
        /(\btree-sitter-language\s*=\s*\{[^\n}]*\bversion\s*=\s*")0\.\d+(?:\.[0-9A-Za-z_.-]+)?("[^\n}]*\})/g,
        "$10.1$2",
    );

    return updated;
}

const REMOVED_API_RENAMES: [string, string][] = [
    ["ts_node_child_containing_descendant", "ts_node_child_with_descendant"],
];

function replaceRemovedApis(source: string): string {
    for (const [old, new_] of REMOVED_API_RENAMES) {
        source = source.replace(new RegExp(`\\b${old}\\b`, "g"), new_);
    }
    return source;
}

const transform: Transform<Rust> = async (root: any) => {
    const rootNode = root.root();
    let source = rootNode.text();

    if (isLikelyCargoToml(source)) {
        return migrateTreeSitterCargoToml(source);
    }

    if (!isLikelyTreeSitterSource(source)) {
        return source;
    }

    source = replaceRemovedApis(source);

    return source;
};

export default transform;
