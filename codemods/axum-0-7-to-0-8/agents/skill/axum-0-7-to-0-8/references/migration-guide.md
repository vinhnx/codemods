# axum 0.7 → 0.8 Migration Reference

Use this to handle everything the codemod cannot automate.

## What the codemod already handles

- `/:param` → `/{param}` in route path strings
- `/*rest` → `/{*rest}` in route path strings
- Applies to `.route()`, `.route_service()`, `.nest()`, `.nest_service()`
- Handles both normal string literals and raw string literals (`r"..."`, `r#"..."#`)

---

## What requires manual follow-up

### 1. Cargo.toml

```toml
# v0.7
axum = "0.7"

# v0.8
axum = "0.8"
```

### 2. Route path strings stored in variables (not automated)

The codemod only rewrites string literals directly in method call arguments. Paths stored in `const`, `static`, or variables must be updated manually:

```rust
// NOT rewritten by codemod
const USER_PATH: &str = "/:id";
static ITEMS: &str = "/:category/:id";

// Manual fix
const USER_PATH: &str = "/{id}";
static ITEMS: &str = "/{category}/{id}";
```

### 3. Body type: `hyper::Body` removed

axum no longer re-exports `hyper::Body`. Replace with `axum::body::Body`:

```rust
// v0.7
use hyper::Body;
async fn handler() -> Body { ... }

// v0.8
use axum::body::Body;
async fn handler() -> Body { ... }
```

`extract::BodyStream` was also removed — use `body::Body` which now implements `Stream` directly:

```rust
// v0.7
use axum::extract::BodyStream;

// v0.8
use axum::body::Body;
// Body implements Stream<Item = Result<Bytes, Error>>
```

### 4. Generic body parameter `B` removed

Several core types lost their `<B>` generic:

| Type | v0.7 | v0.8 |
|------|------|------|
| `FromRequest` | `FromRequest<S, B>` | `FromRequest<S>` |
| `Handler` | `Handler<T, S, B>` | `Handler<T, S>` |
| `MethodRouter` | `MethodRouter<S, B>` | `MethodRouter<S>` |
| `Router` | `Router<S, B>` | `Router<S>` |
| `Route` | `Route<B>` | `Route` |

```rust
// v0.7
impl<S, B> FromRequest<S, B> for MyExtractor
where
    B: Send + 'static,
{ ... }

// v0.8
impl<S> FromRequest<S> for MyExtractor { ... }
```

### 5. WebSocket: `Message` uses `Bytes` instead of `Vec<u8>`

```rust
// v0.7
Message::Binary(vec![1, 2, 3])
if let Message::Text(s) = msg { ... } // s: String

// v0.8
Message::Binary(Bytes::from(vec![1, 2, 3]))
if let Message::Text(s) = msg { ... } // s: Utf8Bytes (not String)
```

`WebSocket::close()` was removed — send a `Message::Close` frame explicitly:

```rust
// v0.8
socket.send(Message::Close(None)).await?;
```

### 6. `Option<Query<T>>` and `Option<Path<T>>` behavior changed

These no longer swallow all errors. In v0.8, invalid query strings or path parameters cause rejection rather than returning `None`:

```rust
// v0.7 — None on any parse error
async fn handler(q: Option<Query<MyParams>>) { ... }

// v0.8 — rejects the request on parse error (returns 400, not None)
// Use Query<Option<MyParams>> or handle errors explicitly
async fn handler(q: Option<Query<MyParams>>) { ... }
```

Path tuple extractors also now validate that the number of parameters matches the tuple length exactly.

### 7. `Host` extractor moved to `axum-extra`

```rust
// v0.7
use axum::extract::Host;

// v0.8
// Add to Cargo.toml: axum-extra = { version = "0.10", features = ["typed-header"] }
use axum_extra::extract::Host;
```

### 8. `async_trait` on `FromRequest` / `FromRequestParts`

axum 0.8 requires Rust 1.75+ and uses RPITIT instead of `#[async_trait]`. Custom extractor implementations no longer need the macro:

```rust
// v0.7
#[async_trait]
impl<S> FromRequestParts<S> for MyExtractor
where
    S: Send + Sync,
{
    async fn from_request_parts(...) -> Result<Self, Self::Rejection> { ... }
}

// v0.8 — no #[async_trait] needed
impl<S> FromRequestParts<S> for MyExtractor
where
    S: Send + Sync,
{
    async fn from_request_parts(...) -> Result<Self, Self::Rejection> { ... }
}
```

### 9. `Sync` bound on handlers and services

All handlers/services added to `Router` and `MethodRouter` now require `Sync`. If you have non-`Sync` types in your handler state, you'll need to wrap them (e.g., `Mutex`).

### 10. Minimum Rust version

axum 0.8 requires Rust **1.75**. Update your `rust-toolchain.toml` or CI if needed.

---

## Verification checklist

After running the codemod:
- [ ] `Cargo.toml` updated to `axum = "0.8"`
- [ ] Route path constants/variables updated manually
- [ ] `hyper::Body` → `axum::body::Body`
- [ ] `extract::BodyStream` usages removed/replaced
- [ ] Generic `<B>` body parameter removed from custom `FromRequest` impls
- [ ] WebSocket `Message::Binary` updated to use `Bytes`
- [ ] `WebSocket::close()` replaced with explicit close message
- [ ] `Option<Query<T>>` / `Option<Path<T>>` error handling reviewed
- [ ] `Host` extractor import updated to `axum-extra`
- [ ] `#[async_trait]` removed from custom extractors
- [ ] `Sync` bounds satisfied for all handler state
- [ ] Rust version ≥ 1.75
- [ ] `cargo check` and `cargo test` pass
