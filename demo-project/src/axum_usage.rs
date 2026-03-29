use axum::{
    routing::{get, post},
    Router,
    extract::{Path, Query, Json},
    response::IntoResponse,
};

pub fn create_router() -> Router {
    Router::new()
        .route("/", get(root_handler))
        .route("/users/:id", get(get_user))
        .route("/users/:id/posts/:post_id", get(get_user_post))
        .route("/files/*path", get(serve_file))
        .route("/api/v1/items", post(create_item))
        .route("/search", get(search_handler))
}

/// Nested router with old syntax
pub fn api_router() -> Router {
    Router::new()
        .route("/health", get(health_check))
        .nest("/api/v1", api_v1_router())
        .nest_service("/static", static_service())
}

fn api_v1_router() -> Router {
    Router::new()
        .route("/users/:user_id/profile", get(get_profile))
        .route("/items/:item_id/comments/:comment_id", get(get_comment))
}

async fn root_handler() -> &'static str {
    "Hello, World!"
}

async fn get_user(Path(id): Path<u64>) -> impl IntoResponse {
    format!("User {}", id)
}

async fn get_user_post(Path((user_id, post_id)): Path<(u64, u64)>) -> impl IntoResponse {
    format!("User {} Post {}", user_id, post_id)
}

async fn serve_file(Path(path): Path<String>) -> impl IntoResponse {
    format!("File: {}", path)
}

async fn create_item(Json(body): Json<String>) -> impl IntoResponse {
    format!("Created: {}", body)
}

async fn search_handler(Query(params): Query<String>) -> impl IntoResponse {
    format!("Search: {}", params)
}

async fn health_check() -> &'static str {
    "OK"
}

async fn get_profile(Path(user_id): Path<u64>) -> impl IntoResponse {
    format!("Profile for user {}", user_id)
}

async fn get_comment(Path((item_id, comment_id)): Path<(u64, u64)>) -> impl IntoResponse {
    format!("Comment {} on item {}", comment_id, item_id)
}

fn static_service() -> Router {
    Router::new()
}

/// Non-axum code that should NOT be touched
fn unrelated_route(x: &str) -> &str {
    x
}
