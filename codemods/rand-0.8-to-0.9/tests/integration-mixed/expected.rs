use rand::{rng, Rng};

fn pick() -> (u8, bool, usize) {
    let mut rng = rng();
    let n = rng.random::<u8>();
    let b = rng.random_bool(0.5);
    let r = Rng::random_range(&mut rng, 1..=5);
    (n, b, r)
}
