use clap::{Arg, Command};

fn build_cli() -> Command<'static> {
    Command::new("myapp")
        .arg(Arg::new("input"))
}
