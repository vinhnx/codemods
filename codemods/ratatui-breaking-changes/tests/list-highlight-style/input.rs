use ratatui::prelude::*;
use ratatui::widgets::{Block, List, ListItem};

fn draw_list(frame: &mut Frame, area: Rect) {
    let items = vec![
        ListItem::new("Item 1"),
        ListItem::new("Item 2"),
        ListItem::new("Item 3"),
    ];
    let list = List::new(items)
        .block(Block::bordered().title("Items"))
        .highlight_style(Style::new().reversed().fg(Color::Cyan));
    frame.render_widget(list, area);
}

fn draw_table(frame: &mut Frame, area: Rect) {
    use ratatui::widgets::{Table, Row};
    let rows = vec![Row::new(vec!["A", "B"])];
    let widths = [Constraint::Percentage(50); 2];
    let table = Table::new(rows, widths)
        .highlight_style(Style::new().reversed());
    frame.render_widget(table, area);
}
