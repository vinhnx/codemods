use clap::{AppSettings, ArgEnum, Parser, Subcommand, Args};

#[derive(Parser, Debug, Clone)]
#[clap(
    name = "vtcode",
    version,
    about = "VT Code - AI coding assistant",
    color = clap::ColorChoice::Auto
)]
#[clap(setting(AppSettings::ColoredHelp))]
pub struct Cli {
    #[clap(value_name = "WORKSPACE")]
    pub workspace_path: Option<String>,

    #[clap(long)]
    pub model: Option<String>,

    #[clap(short = 'p', long = "print", value_name = "PROMPT")]
    pub print: Option<String>,

    #[clap(short = 'r', long = "resume", value_name = "SESSION_ID")]
    pub resume_session: Option<String>,

    #[clap(subcommand)]
    pub command: Option<Commands>,
}

#[derive(ArgEnum, Clone, Debug, PartialEq, Eq)]
pub enum OutputFormat {
    Json,
    Text,
    Ndjson,
}

#[derive(ArgEnum, Clone, Debug, PartialEq, Eq)]
pub enum SchemaMode {
    Minimal,
    Progressive,
    Full,
}

#[derive(Subcommand, Debug, Clone)]
pub enum Commands {
    Chat,

    Ask {
        #[clap(value_name = "PROMPT")]
        prompt: Option<String>,
        #[clap(long = "output-format", value_enum)]
        output_format: Option<OutputFormat>,
    },

    Exec {
        #[clap(long)]
        json: bool,
        #[clap(subcommand)]
        command: Option<ExecSubcommand>,
    },
}

#[derive(Subcommand, Debug, Clone)]
pub enum ExecSubcommand {
    #[clap(
        long_about = "Resume a previous exec session.\n\nExamples:\n  vtcode exec resume session-123"
    )]
    Resume {
        session_id: String,
        #[clap(short, long)]
        prompt: Option<String>,
    },
}

fn error_handling_demo() {
    use clap::ErrorKind;
    let app = Cli::into_app();
    let result = app.try_get_matches_from(vec!["vtcode"]);

    if let Err(e) = result {
        match e.kind {
            ErrorKind::EmptyValue => {
                eprintln!("Missing required value");
            }
            ErrorKind::UnrecognizedSubcommand => {
                eprintln!("Unknown command");
            }
            _ => {
                eprintln!("Error: {}", e);
            }
        }
    }
}
