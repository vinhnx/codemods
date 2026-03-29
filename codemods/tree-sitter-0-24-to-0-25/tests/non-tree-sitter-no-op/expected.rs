// No tree_sitter import — codemod must NOT change anything here.
use std::collections::HashMap;

struct XmlNode {
    name: String,
    children: Vec<XmlNode>,
}

impl XmlNode {
    /// Custom traversal helper that happens to use the same method name.
    fn child_containing_descendant(&self, tag: &str) -> Option<&XmlNode> {
        self.children.iter().find(|c| c.name == tag)
    }

    fn ts_node_child_containing_descendant(&self, tag: &str) -> Option<&XmlNode> {
        // same name as the C API but in an unrelated type — must not be renamed
        self.children.iter().find(|c| c.name == tag)
    }
}
