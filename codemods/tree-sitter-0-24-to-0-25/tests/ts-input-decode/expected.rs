use tree_sitter::{Parser, Language};

/// Demonstrates TSInput usage pattern that needs decode field added.
/// In tree-sitter 0.25, TSInput requires a decode function pointer.
fn parse_with_custom_input() {
    let lang = unsafe { tree_sitter_rust() };
    let mut parser = Parser::new();
    parser.set_language(&lang).unwrap();

    let source = b"fn main() {}";
    let tree = parser.parse(source, None).unwrap();
    let root = tree.root_node();

    // Using the removed C API
    let child = unsafe {
        tree_sitter::ffi::ts_node_child_with_descendant(
            root.into(),
            root.child(0).unwrap().into(),
        )
    };

    println!("{:?}", child);
}

extern "C" {
    fn tree_sitter_rust() -> tree_sitter::Language;
}
