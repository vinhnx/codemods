use rand::Rng;

fn main() {
    let mut rng = rand::rng();

    let a: u32 = rng.gen();
    let b: u8 = rng.gen::<u8>();
    let c = rng.gen_range(1..10);
    let d = rng.gen_bool(0.5);
    let e = rng.gen_ratio(1, 3);

    let f: i32 = Rng::gen(&mut rng);
    let g = Rng::gen_range(&mut rng, 5..=9);

    println!("{a} {b} {c} {d} {e} {f} {g}");
}
