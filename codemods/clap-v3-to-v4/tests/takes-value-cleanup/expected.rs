// Tests removal of takes_value from derive attrs and setting = AppSettings:: from #[command].
use clap::{Parser, Subcommand};

#[derive(Parser, Debug)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,

    /// Model override
    #[arg(long)]
    pub model: Option<String>,

    /// Max turns before auto-stop
    #[arg(long, default_value = "100")]
    pub max_turns: u32,

    /// Suppress output
    #[arg(long)]
    pub quiet: bool,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    Ask {
        #[arg()]
        prompt: String,
    },
}
