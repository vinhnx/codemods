use tree_sitter::{Parser, Tree, Node, Language};

/// Traverses a syntax tree to find nodes with a specific type.
fn find_nodes<'a>(node: Node<'a>, node_type: &str, results: &mut Vec<Node<'a>>) {
    if node.kind() == node_type {
        results.push(node);
    }

    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        find_nodes(child, node_type, results);
    }
}

/// Uses the removed C API function via FFI.
extern "C" {
    fn ts_node_child_with_descendant(
        self_: tree_sitter::ffi::TSNode,
        descendant: tree_sitter::ffi::TSNode,
    ) -> tree_sitter::ffi::TSNode;
}

fn analyze_code(lang: Language, source: &str) {
    let mut parser = Parser::new();
    parser.set_language(&lang).unwrap();

    let tree = parser.parse(source, None).unwrap();
    let root = tree.root_node();

    let mut functions = Vec::new();
    find_nodes(root, "function_item", &mut functions);

    for func in &functions {
        println!("Found function at {:?}", func.range());
    }
}

fn main() {
    println!("tree-sitter analyzer ready");
}
