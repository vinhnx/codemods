use rand::{thread_rng, Rng};

fn pick() -> (u8, bool, usize) {
    let mut rng = thread_rng();
    let n = rng.gen::<u8>();
    let b = rng.gen_bool(0.5);
    let r = Rng::gen_range(&mut rng, 1..=5);
    (n, b, r)
}
