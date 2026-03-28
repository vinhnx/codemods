# rand 0.8 → 0.9 Migration Reference

Use this to handle everything the codemod cannot automate.

## What the codemod already handles

- `rand::thread_rng()` → `rand::rng()`
- `thread_rng()` → `rng()` (imported from `rand`)
- `use rand::thread_rng;` → `use rand::rng;`
- Grouped/aliased `thread_rng` imports
- `.gen(...)` → `.random(...)`
- `.gen_range(...)` → `.random_range(...)`
- `.gen_bool(...)` → `.random_bool(...)`
- `.gen_ratio(...)` → `.random_ratio(...)`
- `Rng::gen*(...)` qualified call equivalents

---

## What requires manual follow-up

### 1. Cargo.toml

```toml
# v0.8
rand = "0.8"

# v0.9
rand = "0.9"

# Feature flag rename
# v0.8: rand = { version = "0.8", features = ["serde1"] }
# v0.9: rand = { version = "0.9", features = ["serde"] }

# v0.8: rand = { version = "0.8", features = ["getrandom"] }
# v0.9: rand = { version = "0.9", features = ["os_rng"] }
```

### 2. SeedableRng API renames (not automated)

| v0.8 | v0.9 |
|------|------|
| `SeedableRng::from_entropy()` | `SeedableRng::from_os_rng()` |
| `SeedableRng::from_rng(rng)` | `SeedableRng::try_from_rng(rng)?` (now fallible) |
| — | `SeedableRng::from_rng(rng)` (new infallible variant, different semantics) |

```rust
// v0.8
let rng = SmallRng::from_entropy();
let rng = StdRng::from_rng(&mut thread_rng()).unwrap();

// v0.9
let rng = SmallRng::from_os_rng();
let rng = StdRng::try_from_rng(&mut rand::rng())?;
```

### 3. Module and type renames (not automated)

| v0.8 | v0.9 |
|------|------|
| `rand::distributions` | `rand::distr` |
| `distributions::Standard` | `distr::StandardUniform` |
| `distributions::Slice` | `distr::slice::Choose` |
| `distributions::EmptySlice` | `distr::slice::Empty` |
| `distributions::DistString` | `distr::SampleString` |
| `distributions::DistIter` | `distr::Iter` |
| `distributions::DistMap` | `distr::Map` |
| `WeightedError` | `weighted::Error` |

### 4. Prelude removals

These are no longer re-exported from the prelude:

```rust
// v0.8 — worked via prelude
use rand::prelude::*;
random::<f64>()      // no longer in prelude
thread_rng()         // no longer in prelude

// v0.9 — must qualify explicitly
rand::random::<f64>()
rand::rng()
```

### 5. Uniform distribution now returns Result

```rust
// v0.8 — panics on invalid range
let dist = Uniform::from(5..5); // panics

// v0.9 — returns Result
let dist = Uniform::try_from(5..5)?;
```

### 6. `usize`/`isize` with StandardUniform and Uniform

Support for `usize`/`isize` with `StandardUniform` and `Uniform` was removed. Use the new `UniformUsize` type:

```rust
// v0.9
use rand::distr::uniform::UniformUsize;
```

### 7. ReseedingRng — no longer fork-safe

If you relied on `ReseedingRng` for fork-protection, you must now manually reseed after `fork()`.

### 8. SmallRng seed behavior changed

`SmallRng::seed_from_u64()` produces different values in v0.9. If reproducibility is required (e.g., tests with fixed seeds), update expected values.

---

## Verification checklist

After running the codemod:
- [ ] `Cargo.toml` updated to `rand = "0.9"`
- [ ] Feature flags `serde1` → `serde`, `getrandom` → `os_rng`
- [ ] `from_entropy()` → `from_os_rng()`
- [ ] `from_rng()` → `try_from_rng()` with error handling
- [ ] `rand::distributions` imports → `rand::distr`
- [ ] `Standard` → `StandardUniform`
- [ ] `Uniform::from()` → `Uniform::try_from()` where ranges could be empty
- [ ] Any fixed-seed tests verified for reproducibility
- [ ] `cargo check` and `cargo test` pass
