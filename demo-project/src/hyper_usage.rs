use hyper::Client;
use hyper::client::HttpConnector;
use hyper::{Body, Request, Response, StatusCode};
use hyper::client::connect::HttpConnector as Connector;

/// Create a simple HTTP client
fn create_client() -> Client<HttpConnector> {
    Client::new()
}

/// Create client with HTTPS connector
fn create_https_client() -> Client<HttpsConnector<HttpConnector>> {
    let https = HttpsConnector::new();
    Client::builder().build(https)
}

/// Make a GET request
async fn fetch_url(url: &str) -> Result<String, Box<dyn std::error::Error>> {
    let client = hyper::Client::new();
    let resp = client.get(url.parse()?).await?;
    let body = hyper::body::to_bytes(resp.into_body()).await?;
    Ok(String::from_utf8(body.to_vec())?)
}

/// Using full type path
async fn make_request() -> Result<Response<Body>, hyper::Error> {
    let client: hyper::Client<HttpConnector> = hyper::Client::new();
    let req = Request::builder()
        .method("GET")
        .uri("http://example.com")
        .body(Body::empty())
        .unwrap();
    client.request(req).await
}

/// Using aliased connector
async fn with_aliased_connector() {
    let connector = Connector::new();
    let client = Client::builder().build::<_, Body>(connector);
    let resp = client.get("http://example.com".parse().unwrap()).await;
}

/// Grouped imports
use hyper::{Client as HyperClient, Body as HyperBody};

fn grouped_import_usage() -> HyperClient<HttpConnector> {
    HyperClient::new()
}

/// Non-hyper code that should NOT be touched
fn unrelated_client() {
    struct Client;
    let _c = Client;
}

fn unrelated_http_connector() {
    struct HttpConnector;
    let _c = HttpConnector;
}
