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

function migrateCargoToml(source: string): string {
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

    return updated;
}

function migrateRustSource(source: string): string {
    // C API (FFI extern declarations and call sites):
    //   ts_node_child_containing_descendant → ts_node_child_with_descendant
    source = source.replace(
        /\bts_node_child_containing_descendant\b/g,
        "ts_node_child_with_descendant",
    );

    // Rust method and UFCS:
    //   .child_containing_descendant(desc)     → .child_with_descendant(desc)
    //   Node::child_containing_descendant(...)  → Node::child_with_descendant(...)
    // Note: \b matches at "." and "::" boundaries because those are non-word chars.
    // This cannot match ts_node_child_containing_descendant (already handled above)
    // because "_" before "child" is a word char so \b does not fire there.
    source = source.replace(
        /\bchild_containing_descendant\b/g,
        "child_with_descendant",
    );

    return source;
}

const transform: Transform<Rust> = async (root: any) => {
    const rootNode = root.root();
    let source = rootNode.text();

    if (isLikelyCargoToml(source)) {
        return migrateCargoToml(source);
    }

    if (!isLikelyTreeSitterSource(source)) {
        return source;
    }

    return migrateRustSource(source);
};

export default transform;
