use clap::{App, Arg, AppSettings};

fn build_cli() -> App<'static> {
    App::new("test")
        .setting(AppSettings::ColoredHelp)
        .setting(AppSettings::ArgRequiredElseHelp)
        .arg(
            Arg::new("name")
                .short('n')
                .takes_value(true),
        )
}
