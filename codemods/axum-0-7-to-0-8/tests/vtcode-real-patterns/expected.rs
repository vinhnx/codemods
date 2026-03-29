use anyhow::Result;
use axum::{
    Router,
    extract::{Path, Query, State},
    response::Json,
    routing::{get, post},
};
use serde::Deserialize;
use std::sync::Arc;
use tokio::sync::oneshot;

#[derive(Clone)]
pub struct AppState {
    pub shutdown: Arc<tokio::sync::Mutex<Option<oneshot::Sender<()>>>>,
}

#[derive(Deserialize)]
pub struct CallbackParams {
    pub code: String,
    pub state: Option<String>,
}

/// OAuth callback server — vtcode-auth pattern adapted for axum 0.7 syntax.
pub fn oauth_router(state: AppState) -> Router {
    Router::new()
        .route("/callback", get(handle_callback))
        .route("/auth/callback", get(handle_callback))
        .route("/cancel", get(handle_cancel))
        .route("/health", get(|| async { "OK" }))
        // Provider-specific routes using colon-syntax path params (axum 0.7)
        .route("/{provider}/callback", get(handle_provider_callback))
        .route("/{provider}/cancel", get(handle_provider_cancel))
        .route("/api/{version}/messages", post(handle_messages))
        // Nested with wildcard for static assets
        .nest("/static", axum::routing::get_service(tower_http::services::ServeDir::new("public")))
        .with_state(state)
}

/// A2A server router with versioned API paths.
pub fn a2a_router(state: AppState) -> Router {
    Router::new()
        .route("/a2a", post(handle_rpc))
        .route("/a2a/stream", post(handle_stream))
        .route("/a2a/{session_id}", get(handle_session))
        .route("/a2a/{session_id}/events", get(handle_session_events))
        .nest("/{workspace}/tools", tool_router())
        .with_state(state)
}

pub fn tool_router() -> Router {
    Router::new()
        .route("/{tool_name}", post(dispatch_tool))
        .route("/{tool_name}/{*path}", get(get_tool_resource))
}

async fn handle_callback() -> &'static str { "ok" }
async fn handle_cancel() -> &'static str { "ok" }
async fn handle_provider_callback() -> &'static str { "ok" }
async fn handle_provider_cancel() -> &'static str { "ok" }
async fn handle_messages() -> &'static str { "ok" }
async fn handle_rpc() -> &'static str { "ok" }
async fn handle_stream() -> &'static str { "ok" }
async fn handle_session() -> &'static str { "ok" }
async fn handle_session_events() -> &'static str { "ok" }
async fn dispatch_tool() -> &'static str { "ok" }
async fn get_tool_resource() -> &'static str { "ok" }
