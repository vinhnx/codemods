use clap::{Arg, Command, ErrorKind};

fn build_cli() -> Command<'static> {
    Command::new("myapp")
        .arg(
            Arg::new("input")
                .short('i')
                .long("input")
                .num_args(1..=5),
        )
        .arg(
            Arg::new("verbose")
                .short('v')
                .num_args(1..),
        )
        .arg(
            Arg::new("config")
                .long("config")
                .num_args(2),
        )
}

fn handle_error(kind: ErrorKind) {
    match kind {
        ErrorKind::InvalidValue => println!("empty"),
        ErrorKind::InvalidSubcommand => println!("unknown"),
        _ => println!("other"),
    }
}
