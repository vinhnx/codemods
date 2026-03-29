use tree_sitter::{Language, Node, Parser, Query, QueryCursor, Tree};

/// Symbol extractor — realistic usage pattern from a code-intelligence tool.
pub struct SymbolExtractor {
    parser: Parser,
    language: Language,
}

impl SymbolExtractor {
    pub fn new(language: Language) -> Self {
        let mut parser = Parser::new();
        parser.set_language(&language).unwrap();
        Self { parser, language }
    }

    pub fn extract_symbols(&mut self, source: &str) -> Vec<Symbol> {
        let tree = self.parser.parse(source, None).unwrap();
        self.collect_from_tree(&tree, source)
    }

    fn collect_from_tree(&self, tree: &Tree, source: &str) -> Vec<Symbol> {
        let root = tree.root_node();
        let mut results = Vec::new();
        self.collect_node(root, source, &mut results);
        results
    }

    fn collect_node<'a>(&self, node: Node<'a>, source: &str, results: &mut Vec<Symbol>) {
        if node.kind() == "function_item" || node.kind() == "method_definition" {
            let name_node = node.child_by_field_name("name").unwrap();
            results.push(Symbol {
                name: source[name_node.byte_range()].to_string(),
                kind: SymbolKind::Function,
                range: (node.start_byte(), node.end_byte()),
            });
        }

        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            self.collect_node(child, source, results);
        }
    }

    /// Find which direct child of `ancestor` contains `descendant`.
    /// Uses the removed C API via the Rust binding.
    pub fn find_child_containing<'a>(
        &self,
        ancestor: Node<'a>,
        descendant: Node<'a>,
    ) -> Option<Node<'a>> {
        ancestor.child_with_descendant(descendant)
    }

    /// Same via UFCS — used in some internal helper methods.
    pub fn find_child_containing_ufcs<'a>(
        &self,
        ancestor: Node<'a>,
        descendant: Node<'a>,
    ) -> Option<Node<'a>> {
        Node::child_with_descendant(ancestor, descendant)
    }
}

/// FFI bridge for callers that pass raw TSNode handles.
extern "C" {
    fn ts_node_child_with_descendant(
        self_: tree_sitter::ffi::TSNode,
        descendant: tree_sitter::ffi::TSNode,
    ) -> tree_sitter::ffi::TSNode;
}

pub unsafe fn ffi_find_child(
    parent: tree_sitter::ffi::TSNode,
    descendant: tree_sitter::ffi::TSNode,
) -> tree_sitter::ffi::TSNode {
    ts_node_child_with_descendant(parent, descendant)
}

#[derive(Debug)]
pub struct Symbol {
    pub name: String,
    pub kind: SymbolKind,
    pub range: (usize, usize),
}

#[derive(Debug)]
pub enum SymbolKind {
    Function,
    Class,
    Variable,
}
