// Tests removal of takes_value from derive attrs and setting = AppSettings:: from #[command].
use clap::{AppSettings, Parser, Subcommand};

#[derive(Parser, Debug)]
#[clap(setting = AppSettings::SubcommandRequiredElseHelp)]
pub struct Cli {
    #[clap(subcommand)]
    pub command: Commands,

    /// Model override
    #[clap(long, takes_value = true)]
    pub model: Option<String>,

    /// Max turns before auto-stop
    #[clap(long, takes_value = true, default_value = "100")]
    pub max_turns: u32,

    /// Suppress output
    #[clap(long, takes_value = false)]
    pub quiet: bool,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    Ask {
        #[clap(takes_value = true)]
        prompt: String,
    },
}
