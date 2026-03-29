use serde_json::{Value, json};

/// Mock Gemini API responses for testing
pub struct MockGeminiResponses;

impl MockGeminiResponses {
    pub fn simple_function_call() -> Value {
        json!({
            "candidates": [{
                "content": {
                    "parts": [{
                        "functionCall": {
                            "name": "list_files",
                            "args": {
                                "path": "."
                            }
                        }
                    }]
                }
            }]
        })
    }
}

/// Test data generators
pub struct TestDataGenerator;

impl TestDataGenerator {
    pub fn random_string(length: usize) -> String {
        use rand::Rng;
        let mut rng = rand::thread_rng();
        (0..length)
            .map(|_| rng.sample(rand::distributions::Alphanumeric) as char)
            .collect()
    }

    pub fn random_email() -> String {
        format!("{}@{}.com", Self::random_string(8), Self::random_string(5))
    }

    pub fn random_file_path(extension: &str) -> String {
        format!(
            "/tmp/{}.{}",
            Self::random_string(12),
            extension.trim_start_matches('.')
        )
    }

    pub fn random_port() -> u16 {
        use rand::Rng;
        rand::thread_rng().gen_range(1024..65535)
    }
}
