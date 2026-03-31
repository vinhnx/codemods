use ratatui::prelude::*;
use ratatui::widgets::Block;

fn draw(frame: &mut Frame) {
    let area = frame.area();
    let inner = area.inner(Margin {
        vertical: 1,
        horizontal: 2,
    });
    frame.render_widget(Block::bordered(), area);
    frame.render_widget(Paragraph::new("content"), inner);
}
