use ratatui::prelude::*;
use ratatui::widgets::{Block, Paragraph};

fn ui(frame: &mut Frame) {
    let size = frame.size();
    let block = Block::bordered().title("Hello");
    let paragraph = Paragraph::new("World");
    frame.render_widget(block, size);
    frame.render_widget(paragraph, size);
}
