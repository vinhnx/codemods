use clap::{Arg, Command, ErrorKind, Parser};

#[derive(Parser, Debug)]
#[command(author, version)]
struct Cli {
    #[arg(short, long)]
    input: String,
}

fn builder() -> Command<'static> {
    Command::new("demo")
        .arg(
            Arg::new("files")
                .num_args(1..=3),
        )
}

fn map(kind: ErrorKind) -> ErrorKind {
    match kind {
        ErrorKind::InvalidValue => ErrorKind::InvalidValue,
        ErrorKind::InvalidSubcommand => ErrorKind::InvalidSubcommand,
        _ => kind,
    }
}
