use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::client::legacy::Client;

fn build_client() {
    let _client: Client<HttpConnector> = Client::new();
}
