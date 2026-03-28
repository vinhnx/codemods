use clap::{Arg, Command};

fn build_cli() -> Command<'static> {
    Command::new("myapp")
        .arg(
            Arg::new("files")
                .num_args(2..=5),
        )
        .arg(
            Arg::new("tags")
                .num_args(3..=7),
        )
        .arg(
            Arg::new("mode")
                .num_args(1),
        )
}
