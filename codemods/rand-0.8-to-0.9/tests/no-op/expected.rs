use rand::Rng;

fn main() {
    let mut rng = rand::rng();
    let value: u32 = rng.random();
    println!("{value}");
}
