use clap::{AppSettings, Arg, Command};

fn build_cli() -> Command<'static> {
    Command::new("myapp")
        .setting(AppSettings::ColoredHelp)
        .arg(Arg::new("input"))
}
