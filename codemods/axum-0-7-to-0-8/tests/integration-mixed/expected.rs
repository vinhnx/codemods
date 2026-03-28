use axum::{routing::get, Router};

fn app() -> Router {
    Router::new()
        .route("/users/{id}/posts/{*tail}", get(handler))
        .nest("/api/{version}", api())
}

fn api() -> Router {
    Router::new().route("/repos/{id}", get(handler))
}

async fn handler() {}
