use ratatui::prelude::*;
use ratatui::widgets::{Block, Table, Row, Paragraph};

fn draw_table(frame: &mut Frame, rows: Vec<Row<'static>>, widths: [Constraint; 3]) {
    let area = frame.area();
    let table = Table::new(rows, widths)
        .block(Block::bordered().title("Data"))
        .row_highlight_style(Style::new().reversed());
    frame.render_widget(table, area);
}

fn draw_table_stateful(
    frame: &mut Frame,
    table: Table<'static>,
    area: Rect,
    state: &mut TableState,
) {
    frame.render_stateful_widget(table, area, state);
}
