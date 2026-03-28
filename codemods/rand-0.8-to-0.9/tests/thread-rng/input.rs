use rand::thread_rng;
use rand::thread_rng as make_rng;
use rand::{thread_rng as create_rng, Rng};

fn main() {
    let mut a = thread_rng();
    let mut b = make_rng();
    let mut c = create_rng();
    let mut d = rand::thread_rng();

    let _ = a.gen();
    let _ = b.gen_range(1..=2);
    let _ = c.gen_bool(0.5);
    let _ = d.gen_ratio(1, 2);
}
