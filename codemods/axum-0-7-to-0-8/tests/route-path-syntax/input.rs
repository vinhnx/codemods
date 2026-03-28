use axum::{
    routing::{get, get_service},
    Router,
};

fn app() -> Router {
    Router::new()
        .route("/users/:id", get(user))
        .route_service("/files/*path", get_service(static_files))
        .nest("/teams/:team_id/repos/*repo_path", api_routes())
        .nest_service("/assets/*asset", asset_service())
}

fn api_routes() -> Router {
    Router::new().route("/repos/:id", get(user))
}

async fn user() {}
fn static_files() {}
fn asset_service() {}
