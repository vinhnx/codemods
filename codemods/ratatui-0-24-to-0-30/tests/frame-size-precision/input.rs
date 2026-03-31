use ratatui::prelude::*;

fn ui(frame: &mut Frame) {
    // frame.size() should become .area()
    let area = frame.size();

    // terminal.size() should become .area() when used in draw closures
    let other_area = terminal.size();

    // vec.size() and similar should NOT be renamed
    let items = vec![1, 2, 3];
    let n = items.size();

    // String len — should NOT be renamed
    let s = String::from("hello");
    let _ = s.size();

    frame.render_widget(Paragraph::new("hey"), area);
}
