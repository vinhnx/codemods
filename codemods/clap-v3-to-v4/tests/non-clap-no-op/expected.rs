struct Builder;

impl Builder {
    fn takes_value(self, _enabled: bool) -> Self {
        self
    }

    fn multiple_values(self, _enabled: bool) -> Self {
        self
    }

    fn min_values(self, _count: usize) -> Self {
        self
    }
}

enum ErrorKind {
    EmptyValue,
    UnrecognizedSubcommand,
}

fn build() {
    let builder = Builder;
    let _ = builder
        .takes_value(true)
        .multiple_values(true)
        .min_values(2);

    let kind = ErrorKind::EmptyValue;
    let _ = match kind {
        ErrorKind::EmptyValue => 0,
        ErrorKind::UnrecognizedSubcommand => 1,
    };
}
