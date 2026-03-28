use hyper::{body::Body, client::connect::HttpConnector, Client, Request};

fn typed(client: hyper::Client<hyper::client::connect::HttpConnector>) {
    let _ = client;
}

fn make_request() {
    let _req = Request::builder()
        .uri("http://example.com")
        .body(Body::empty())
        .unwrap();
}
