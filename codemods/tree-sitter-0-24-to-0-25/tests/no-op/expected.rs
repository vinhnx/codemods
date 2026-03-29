use tree_sitter::{Parser, Language, InputEdit, Point};

fn parse_source(lang: Language, source: &str) {
    let mut parser = Parser::new();
    parser.set_language(&lang).unwrap();
    let tree = parser.parse(source, None).unwrap();
    let root = tree.root_node();
    println!("{}", root.to_sexp());
}
