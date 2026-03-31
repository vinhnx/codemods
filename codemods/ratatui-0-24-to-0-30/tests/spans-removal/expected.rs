use ratatui::prelude::*;

fn draw_spans() {
    let spans = Line::from(vec![
        Span::raw("Hello "),
        Span::styled("World", Style::new().red()),
    ]);

    let line = Line::from("simple text");

    let items: Vec<Line> = vec![
        Line::from("line 1"),
        Line::from("line 2"),
    ];
}
