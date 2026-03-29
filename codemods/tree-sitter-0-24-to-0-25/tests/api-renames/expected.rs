use tree_sitter::Language;

extern "C" {
    fn ts_node_child_with_descendant(
        self_: tree_sitter::ffi::TSNode,
        descendant: tree_sitter::ffi::TSNode,
    ) -> tree_sitter::ffi::TSNode;

    fn ts_parser_parse_string(
        self_: *mut tree_sitter::ffi::TSParser,
        old_tree: *const tree_sitter::ffi::TSTree,
        string: *const u8,
        length: u32,
    ) -> *mut tree_sitter::ffi::TSTree;
}

fn call_removed_api(node: tree_sitter::ffi::TSNode, descendant: tree_sitter::ffi::TSNode) -> tree_sitter::ffi::TSNode {
    unsafe {
        ts_node_child_with_descendant(node, descendant)
    }
}
