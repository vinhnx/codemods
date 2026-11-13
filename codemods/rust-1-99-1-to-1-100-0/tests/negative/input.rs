fn test(x: Option<i32>) -> bool {
    if let Some(_) = x { return true; }
    false
}
fn comment(x: bool) -> bool {
    if x { return true; } // keep this explanation
    false
}
macro_rules! example {
    () => {{ if true { return true; } false }};
}

fn nested(x: bool) -> bool {
    let value = { if x { return true; } false };
    !value
}
