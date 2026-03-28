use hyper::{body::Body, Request};
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::client::legacy::Client;

fn typed(client: hyper_util::client::legacy::Client<hyper_util::client::legacy::connect::HttpConnector>) {
    let _ = client;
}

fn make_request() {
    let _req = Request::builder()
        .uri("http://example.com")
        .body(Body::empty())
        .unwrap();
}
