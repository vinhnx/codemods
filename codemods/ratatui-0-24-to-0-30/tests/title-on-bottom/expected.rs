use ratatui::prelude::*;
use ratatui::widgets::Block;

fn draw(frame: &mut Frame) {
    let area = frame.area();

    let block = Block::bordered()
        .title("Top Title")
        .title_bottom();

    let block2 = Block::bordered()
        .title("Also Bottom")
        .title_bottom();

    frame.render_widget(block, area);
    frame.render_widget(block2, area);
}
