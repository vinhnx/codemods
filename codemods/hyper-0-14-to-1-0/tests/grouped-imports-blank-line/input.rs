use hyper::Client;
use hyper::{Body, Request};

fn make_client() -> Client<hyper::client::HttpConnector> {
    hyper::Client::new()
}

fn use_request() {
    let _: Request<Body> = Request::builder().body(Body::empty()).unwrap();
}
