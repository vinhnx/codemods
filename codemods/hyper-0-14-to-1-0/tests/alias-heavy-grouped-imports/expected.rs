use hyper::{Body, Request};
use hyper_util::client::legacy::Client as HyperClient;
use hyper_util::client::legacy::connect::HttpConnector as HC;

fn run(client: HyperClient<HC>) {
    let _req = Request::builder().body(Body::empty()).unwrap();
    let _ = client;
}
