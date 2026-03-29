use tree_sitter::{Node, Parser, Language};

fn find_parent_of<'a>(parent: Node<'a>, target: Node<'a>) -> Option<Node<'a>> {
    // Instance method call form
    parent.child_with_descendant(target)
}

fn find_parent_ufcs<'a>(parent: Node<'a>, target: Node<'a>) -> Option<Node<'a>> {
    // UFCS (universal function call syntax) form
    Node::child_with_descendant(parent, target)
}

fn walk_tree<'a>(node: Node<'a>, target: Node<'a>) -> Option<Node<'a>> {
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        // Mixed: instance method inside a loop
        if let Some(found) = child.child_with_descendant(target) {
            return Some(found);
        }
    }
    None
}
