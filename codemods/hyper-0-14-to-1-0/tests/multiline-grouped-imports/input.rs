use hyper::{
    body::Body,
    client::connect::HttpConnector,
    Client,
    Request,
};

fn build() -> Client<HttpConnector> {
    Client::new()
}

fn req() {
    let _ = Request::builder().body(Body::empty()).unwrap();
}
