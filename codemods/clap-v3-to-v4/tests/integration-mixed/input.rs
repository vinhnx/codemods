use clap::{AppSettings, Arg, Command, ErrorKind, Parser};

#[derive(Parser, Debug)]
#[clap(author, version)]
struct Cli {
    #[clap(short, long, value_parser)]
    input: String,
}

fn builder() -> Command<'static> {
    Command::new("demo")
        .setting(AppSettings::ColoredHelp)
        .arg(
            Arg::new("files")
                .takes_value(true)
                .multiple_values(true)
                .max_values(3),
        )
}

fn map(kind: ErrorKind) -> ErrorKind {
    match kind {
        ErrorKind::EmptyValue => ErrorKind::EmptyValue,
        ErrorKind::UnrecognizedSubcommand => ErrorKind::UnrecognizedSubcommand,
        _ => kind,
    }
}
