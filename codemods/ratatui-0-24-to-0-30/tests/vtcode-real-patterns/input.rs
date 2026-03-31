use ratatui::terminal::{CompletedFrame, Frame, Terminal, Viewport};
use ratatui::prelude::*;
use ratatui::widgets::{Block, Paragraph, Table, Row, Borders, List};
use ratatui::widgets::block::{Title, Position};
use ratatui::text::Spans;

fn draw_main_ui(terminal: &mut Terminal<impl Backend>) -> std::io::Result<()> {
    terminal.draw(|frame| {
        let size = frame.size();

        // Layout
        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(3),
                Constraint::Min(0),
                Constraint::Length(1),
            ])
            .split(size);

        // Title bar
        let title = Block::bordered()
            .title(Title::from(" VT Code ").alignment(Alignment::Center))
            .title(Title::from(" v0.1.0 ").position(Position::Bottom));
        frame.render_widget(title, chunks[0]);

        // Main area with table
        let rows = vec![
            Row::new(vec!["file.rs", "120", "OK"]),
            Row::new(vec!["main.rs", "85", "WARN"]),
        ];
        let widths = [
            Constraint::Percentage(50),
            Constraint::Percentage(25),
            Constraint::Percentage(25),
        ];
        let table = Table::new(rows, widths)
            .block(Block::bordered().title("Files"))
            .highlight_style(Style::new().reversed().fg(Color::Cyan));
        frame.render_widget(table, chunks[1]);

        // Status bar with Spans
        let status = Spans::from(vec![
            Span::raw(" Mode: "),
            Span::styled("NORMAL", Style::new().green().bold()),
            Span::raw(" | File: "),
            Span::styled("main.rs", Style::new().yellow()),
        ]);
        frame.render_widget(Paragraph::new(status), chunks[2]);
    })?;
    Ok(())
}

fn draw_with_inner_margin(frame: &mut Frame) {
    let area = frame.size();
    let inner = area.inner(&Margin {
        vertical: 1,
        horizontal: 2,
    });

    let block = Block::bordered()
        .title("Editor")
        .title_on_bottom();
    frame.render_widget(block, area);

    let content = Paragraph::new("Hello, world!");
    frame.render_widget(content, inner);
}

fn draw_list(frame: &mut Frame, area: Rect) {
    let items = vec!["Item 1", "Item 2", "Item 3"];
    let list = List::new(items)
        .block(Block::bordered().title("Items"))
        .highlight_style(Style::new().add_modifier(Modifier::BOLD));
    frame.render_widget(list, area);
}

fn buffer_fill_demo(buf: &mut Buffer, area: Rect) {
    Buffer::filled(area, &Cell::new("X"));
}

fn border_demo() {
    let border_set: ratatui::symbols::line::Set = BorderType::line_symbols(BorderType::Plain);
    let block = Block::bordered()
        .border_set(border_set);
}

fn scrollbar_demo(frame: &mut Frame, area: Rect) {
    use ratatui::widgets::scrollbar::{Scrollbar, Set};

    let scrollbar = Scrollbar::default()
        .track_symbol("|")
        .orientation(ratatui::widgets::scrollbar::ScrollbarOrientation::VerticalRight);
    frame.render_widget(scrollbar, area);
}
