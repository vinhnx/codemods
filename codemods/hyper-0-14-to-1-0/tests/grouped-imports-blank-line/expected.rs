use hyper_util::client::legacy::Client;
use hyper::{Body, Request};

fn make_client() -> Client<hyper_util::client::legacy::connect::HttpConnector> {
    hyper_util::client::legacy::Client::new()
}

fn use_request() {
    let _: Request<Body> = Request::builder().body(Body::empty()).unwrap();
}
