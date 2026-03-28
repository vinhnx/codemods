# hyper 0.14 -> 1.x Migration Reference

Use this to handle everything the codemod cannot automate.

## What the codemod already handles

- Rewrites legacy client import paths to `hyper_util::client::legacy::*`
- Rewrites fully-qualified legacy client type paths in source

---

## What requires manual follow-up

### 1. Cargo.toml dependency updates

Update dependencies to Hyper 1 and add `hyper-util` as needed:

```toml
hyper = "1"
hyper-util = { version = "0.1", features = ["client-legacy", "http1", "http2", "tokio"] }
```

### 2. Client builder initialization

Hyper 1 generally uses `hyper_util` builders for legacy client ergonomics. Review client creation, executor wiring, and protocol settings:

```rust
use hyper_util::client::legacy::Client;
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::rt::TokioExecutor;

let client: Client<HttpConnector, http_body_util::Empty<bytes::Bytes>> =
    Client::builder(TokioExecutor::new()).build_http();
```

### 3. Body utilities and collection

Body helpers differ in Hyper 1. Migrate body collection and conversion utilities (for example old `to_bytes` patterns) to `http-body-util` APIs where needed.

### 4. Server migration

Server-side migration from old convenience builders often needs a manual update strategy depending on how your accept loop and connection handling are structured.

### 5. Feature flags

Validate feature selections for `hyper` and `hyper-util` in your `Cargo.toml` (for example `client-legacy`, protocol features, runtime integration).

### 6. Runtime and toolchain compatibility

Confirm Tokio/runtime versions and Rust toolchain versions satisfy the crates in your lockfile after upgrade.

---

## Verification checklist

After running the codemod:

- [ ] `Cargo.toml` updated to Hyper 1 and includes suitable `hyper-util` settings
- [ ] Legacy client imports and paths now point to `hyper_util::client::legacy`
- [ ] Client construction compiles with chosen executor/builders
- [ ] Body handling APIs compile under Hyper 1 ecosystem crates
- [ ] `cargo check` and `cargo test` pass
