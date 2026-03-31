use ratatui::prelude::*;

fn draw_spans() {
    let spans = Spans::from(vec![
        Span::raw("Hello "),
        Span::styled("World", Style::new().red()),
    ]);

    let line = Spans::from("simple text");

    let items: Vec<Spans> = vec![
        Spans::from("line 1"),
        Spans::from("line 2"),
    ];
}
