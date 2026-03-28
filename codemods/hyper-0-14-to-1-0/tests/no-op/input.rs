use hyper_util::client::legacy::Client;
use hyper_util::client::legacy::connect::HttpConnector;

fn already_migrated(client: Client<HttpConnector>) {
    let _ = client;
}
