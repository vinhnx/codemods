use clap::{App, Arg, SubCommand, ArgEnum, AppSettings, ArgGroup};

#[derive(ArgEnum, Clone, Debug)]
enum LogLevel {
    Debug,
    Info,
    Warn,
    Error,
}

#[derive(ArgEnum, Clone, Debug)]
enum OutputFormat {
    Json,
    Text,
    Csv,
}

fn build_cli() -> App<'static> {
    App::new("migration-demo")
        .version("1.0")
        .about("Demo app for codemod testing")
        .setting(AppSettings::ColoredHelp)
        .setting(AppSettings::ArgRequiredElseHelp)
        .arg(
            Arg::new("config")
                .short('c')
                .long("config")
                .takes_value(true)
                .help("Config file path"),
        )
        .arg(
            Arg::new("verbose")
                .short('v')
                .long("verbose")
                .multiple_values(true)
                .help("Enable verbose output"),
        )
        .arg(
            Arg::new("output")
                .short('o')
                .long("output")
                .takes_value(true)
                .possible_values(["json", "text", "csv"])
                .help("Output format"),
        )
        .arg(
            Arg::new("files")
                .short('f')
                .long("files")
                .takes_value(true)
                .multiple_values(true)
                .require_value_delimiter(true)
                .min_values(1)
                .max_values(10)
                .help("Input files"),
        )
        .arg(
            Arg::new("ports")
                .long("ports")
                .takes_value(true)
                .number_of_values(2)
                .help("Port range"),
        )
        .arg(
            Arg::new("level")
                .long("level")
                .takes_value(true)
                .possible_values(["debug", "info", "warn", "error"])
                .help("Log level"),
        )
        .arg(
            Arg::new("log-level")
                .long("log-level")
                .takes_value(true)
                .help("Set log level"),
        )
        .arg(
            Arg::new("name")
                .takes_value(true)
                .required(true)
                .help("Name of the user"),
        )
        .subcommand(
            SubCommand::new("init")
                .about("Initialize project")
                .arg(
                    Arg::new("template")
                        .long("template")
                        .takes_value(true)
                        .help("Template to use"),
                ),
        )
        .subcommand(
            SubCommand::new("run")
                .about("Run the project")
                .arg(
                    Arg::new("target")
                        .long("target")
                        .takes_value(true)
                        .required(true)
                        .help("Target to run"),
                ),
        )
}

fn handle_matches() {
    let matches = build_cli().get_matches();

    if let Some(config) = matches.value_of("config") {
        println!("Config: {}", config);
    }

    if matches.is_present("verbose") {
        println!("Verbose mode enabled");
    }

    match matches.subcommand() {
        Some(("init", sub_matches)) => {
            if let Some(template) = sub_matches.value_of("template") {
                println!("Init with template: {}", template);
            }
        }
        Some(("run", sub_matches)) => {
            if let Some(target) = sub_matches.value_of("target") {
                println!("Running: {}", target);
            }
        }
        _ => {}
    }
}

fn error_handling_demo() {
    let app = build_cli();
    let result = app.try_get_matches();

    if let Err(e) = result {
        match e.kind {
            clap::ErrorKind::EmptyValue => {
                println!("Empty value error");
            }
            clap::ErrorKind::UnrecognizedSubcommand => {
                println!("Unknown subcommand");
            }
            clap::ErrorKind::InvalidValue => {
                println!("Invalid value");
            }
            _ => {
                println!("Other error: {:?}", e);
            }
        }
    }
}

/// Non-clap code that should NOT be touched
fn unrelated_enum() {
    #[derive(Debug)]
    enum ArgEnum {
        A,
        B,
    }
    println!("{:?}", ArgEnum::A);
}
