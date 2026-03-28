use clap::Parser;

#[derive(Parser)]
#[command(author, version)]
struct Cli {
    #[arg(value_enum)]
    mode: Mode,
}

#[derive(Clone, clap::ValueEnum)]
enum Mode {
    Fast,
    Slow,
}
