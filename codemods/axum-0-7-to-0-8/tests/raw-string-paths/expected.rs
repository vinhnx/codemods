use axum::{routing::get, Router};

fn app() -> Router {
    Router::new()
        .route(r"/projects/{project_id}", get(handler))
        .route(r#"/docs/{*page}"#, get(handler))
        .nest_service(
            r##"/orgs/{org_id}/files/{*rest}"##,
            service(),
        )
}

async fn handler() {}
fn service() {}
