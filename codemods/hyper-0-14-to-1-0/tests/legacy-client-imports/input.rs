use hyper::client::HttpConnector;
use hyper::Client;

fn build_client() {
    let _client: Client<HttpConnector> = Client::new();
}
