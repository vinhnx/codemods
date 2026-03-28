use clap::{Arg, Command, AppSettings, ErrorKind};

fn build_cli() -> Command<'static> {
    Command::new("myapp")
        .setting(AppSettings::ColoredHelp)
        .arg(
            Arg::new("input")
                .short('i')
                .long("input")
                .takes_value(true)
                .multiple_values(true)
                .min_values(1)
                .max_values(5)
                .require_value_delimiter(true),
        )
        .arg(
            Arg::new("verbose")
                .short('v')
                .takes_value(false)
                .multiple(true),
        )
        .arg(
            Arg::new("config")
                .long("config")
                .number_of_values(2),
        )
}

fn handle_error(kind: ErrorKind) {
    match kind {
        ErrorKind::EmptyValue => println!("empty"),
        ErrorKind::UnrecognizedSubcommand => println!("unknown"),
        _ => println!("other"),
    }
}
