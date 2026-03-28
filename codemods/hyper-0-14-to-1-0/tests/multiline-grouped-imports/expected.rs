use hyper::{body::Body, Request};
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::client::legacy::Client;

fn build() -> Client<HttpConnector> {
    Client::new()
}

fn req() {
    let _ = Request::builder().body(Body::empty()).unwrap();
}
