use clap::{App, ErrorKind};

fn error_handling() {
    let app = App::new("test");
    let result = app.try_get_matches();

    if let Err(e) = result {
        match e.kind {
            ErrorKind::EmptyValue => {
                println!("empty");
            }
            ErrorKind::InvalidValue => {
                println!("invalid");
            }
            ErrorKind::UnrecognizedSubcommand => {
                println!("unknown");
            }
            _ => {
                println!("other");
            }
        }
    }
}
