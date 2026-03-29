use rand::{thread_rng, Rng};
use rand::distributions::Alphanumeric;
use rand::RngCore;

/// Generate a random string using thread_rng
pub fn random_string(length: usize) -> String {
    let mut rng = rand::thread_rng();
    (0..length)
        .map(|_| rng.sample(Alphanumeric) as char)
        .collect()
}

/// Generate a random port number
pub fn random_port() -> u16 {
    use rand::Rng;
    rand::thread_rng().gen_range(1024..65535)
}

/// Generate random boolean
pub fn coin_flip() -> bool {
    let mut rng = thread_rng();
    rng.gen_bool(0.5)
}

/// Generate random ratio
pub fn random_ratio_check() -> bool {
    let mut rng = thread_rng();
    rng.gen_ratio(1, 10)
}

/// Generate typed random value
pub fn random_u32() -> u32 {
    let mut rng = thread_rng();
    rng.gen::<u32>()
}

/// Using Rng::gen_range directly
pub fn random_in_range(min: u32, max: u32) -> u32 {
    let mut rng = thread_rng();
    Rng::gen_range(&mut rng, min..max)
}

/// Using Rng::gen directly
pub fn random_value() -> u8 {
    let mut rng = thread_rng();
    Rng::gen(&mut rng)
}

/// Thread rng with alias
use rand::thread_rng as my_rng;

fn aliased_usage() -> u64 {
    let mut r = my_rng();
    r.gen::<u64>()
}

/// Non-rand code that should NOT be touched
fn unrelated_gen(x: i32) -> i32 {
    x.gen()  // This is not rand, should not be changed
}

/// Generate bytes using RngCore
pub fn random_bytes(count: usize) -> Vec<u8> {
    let mut rng = thread_rng();
    let mut buf = vec![0u8; count];
    rng.fill_bytes(&mut buf);
    buf
}
