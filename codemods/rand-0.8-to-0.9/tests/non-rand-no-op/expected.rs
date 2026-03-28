use std::ops::Range;

trait Generator {
    fn gen(&mut self) -> u32;
    fn gen_range(&mut self, range: Range<u32>) -> u32;
}

struct CustomRng;

impl Generator for CustomRng {
    fn gen(&mut self) -> u32 {
        7
    }

    fn gen_range(&mut self, range: Range<u32>) -> u32 {
        range.start
    }
}

fn thread_rng() -> CustomRng {
    CustomRng
}

fn run() {
    let mut rng = thread_rng();
    let _ = rng.gen();
    let _ = rng.gen_range(1..3);
}
