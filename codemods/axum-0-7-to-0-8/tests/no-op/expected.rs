use std::fmt::Write;

struct CustomRouter;

impl CustomRouter {
    fn route(self, path: &str) -> Self {
        let mut output = String::new();
        let _ = write!(&mut output, "{path}");
        self
    }
}

fn build() {
    let docs = "/:id";
    let _ = docs;
    let router = CustomRouter;
    let _ = router.route("/:id");
}
