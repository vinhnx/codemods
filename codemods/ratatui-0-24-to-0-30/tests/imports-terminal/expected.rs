use ratatui::{CompletedFrame, Frame, Terminal, TerminalOptions, Viewport};
use ratatui::widgets::Block;

fn run(mut terminal: Terminal<impl Backend>) -> std::io::Result<()> {
    loop {
        terminal.draw(|frame| {
            let size = frame.area();
            frame.render_widget(Block::bordered(), size);
        })?;
    }
}
