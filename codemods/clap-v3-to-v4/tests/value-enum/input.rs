use clap::Parser;

#[derive(Parser)]
#[clap(author, version)]
struct Cli {
    #[clap(arg_enum)]
    mode: Mode,
}

#[derive(Clone, clap::ArgEnum)]
enum Mode {
    Fast,
    Slow,
}
