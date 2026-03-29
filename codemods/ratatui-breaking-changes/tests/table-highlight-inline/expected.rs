use ratatui::prelude::*;
use ratatui::widgets::{Table, Row};

fn draw(frame: &mut Frame) {
    let area = frame.area();
    // Single-line chain
    let t = Table::new(vec![Row::new(vec!["a"])], [Constraint::Fill(1)]).row_highlight_style(Style::new().reversed());
    frame.render_widget(t, area);
}
