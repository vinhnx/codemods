use serde_json::{Value, json};

fn not_ratatui_code() -> Value {
    json!({
        "size": 42,
        "area": 100
    })
}

fn other_size(x: &str) -> usize {
    x.size()
}
