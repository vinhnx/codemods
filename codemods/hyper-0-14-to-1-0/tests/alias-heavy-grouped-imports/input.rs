use hyper::{Body, Client as HyperClient, client::HttpConnector as HC, Request};

fn run(client: HyperClient<HC>) {
    let _req = Request::builder().body(Body::empty()).unwrap();
    let _ = client;
}
