use clap::{App, Arg};

fn build_cli() -> App<'static> {
    App::new("test")
        .arg(
            Arg::new("name")
                .short('n')
                .num_args(1..),
        )
}
