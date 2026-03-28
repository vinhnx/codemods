use rand::rng;
use rand::rng as make_rng;
use rand::{rng as create_rng, Rng};

fn main() {
    let mut a = rng();
    let mut b = make_rng();
    let mut c = create_rng();
    let mut d = rand::rng();

    let _ = a.random();
    let _ = b.random_range(1..=2);
    let _ = c.random_bool(0.5);
    let _ = d.random_ratio(1, 2);
}
