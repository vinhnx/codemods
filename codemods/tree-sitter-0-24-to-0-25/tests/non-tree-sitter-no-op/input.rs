use std::collections::HashMap;

struct TreeConfig {
    name: String,
    children: Vec<TreeNode>,
}

struct TreeNode {
    id: usize,
    label: String,
}

fn tree_sitter_demo() {
    let config = TreeConfig {
        name: "tree_sitter".to_string(),
        children: vec![],
    };
    println!("{}", config.name);
}
