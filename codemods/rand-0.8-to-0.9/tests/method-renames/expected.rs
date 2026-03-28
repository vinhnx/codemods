use rand::Rng;

fn main() {
    let mut rng = rand::rng();

    let a: u32 = rng.random();
    let b: u8 = rng.random::<u8>();
    let c = rng.random_range(1..10);
    let d = rng.random_bool(0.5);
    let e = rng.random_ratio(1, 3);

    let f: i32 = Rng::random(&mut rng);
    let g = Rng::random_range(&mut rng, 5..=9);

    println!("{a} {b} {c} {d} {e} {f} {g}");
}
