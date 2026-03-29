use clap::{ValueEnum, Parser, Subcommand, Args};

#[derive(Parser, Debug, Clone)]
#[command(name = "vtcode",
    version,
    about = "VT Code - AI coding assistant",
    color = clap::ColorChoice::Auto)]
pub struct Cli {
    #[arg(value_name = "WORKSPACE")]
    pub workspace_path: Option<String>,

    #[arg(long)]
    pub model: Option<String>,

    #[arg(short = 'p', long = "print", value_name = "PROMPT")]
    pub print: Option<String>,

    #[arg(short = 'r', long = "resume", value_name = "SESSION_ID")]
    pub resume_session: Option<String>,

    #[command(subcommand)]
    pub command: Option<Commands>,
}

#[derive(ValueEnum, Clone, Debug, PartialEq, Eq)]
pub enum OutputFormat {
    Json,
    Text,
    Ndjson,
}

#[derive(ValueEnum, Clone, Debug, PartialEq, Eq)]
pub enum SchemaMode {
    Minimal,
    Progressive,
    Full,
}

#[derive(Subcommand, Debug, Clone)]
pub enum Commands {
    Chat,

    Ask {
        #[arg(value_name = "PROMPT")]
        prompt: Option<String>,
        #[arg(long = "output-format", value_enum)]
        output_format: Option<OutputFormat>,
    },

    Exec {
        #[arg(long)]
        json: bool,
        #[command(subcommand)]
        command: Option<ExecSubcommand>,
    },
}

#[derive(Subcommand, Debug, Clone)]
pub enum ExecSubcommand {
    #[command(
        long_about = "Resume a previous exec session.\n\nExamples:\n  vtcode exec resume session-123"
    )]
    Resume {
        session_id: String,
        #[arg(short, long)]
        prompt: Option<String>,
    },
}

fn error_handling_demo() {
    use clap::ErrorKind;
    let app = Cli::into_app();
    let result = app.try_get_matches_from(vec!["vtcode"]);

    if let Err(e) = result {
        match e.kind {
            ErrorKind::InvalidValue => {
                eprintln!("Missing required value");
            }
            ErrorKind::InvalidSubcommand => {
                eprintln!("Unknown command");
            }
            _ => {
                eprintln!("Error: {}", e);
            }
        }
    }
}
