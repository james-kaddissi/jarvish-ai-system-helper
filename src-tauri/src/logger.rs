pub fn process_log(message: String, level: String) {
    match level.as_str() {
        "info" => log_info(message, "[F]".to_string()),
        "warn" => log_warning(message, "[F]".to_string()),
        "error" => log_error(message, "[F]".to_string()),
        "debug" => log_debug(message, "[F]".to_string()),
        _ => println!("Unknown log level: {}", level),
    }
}

pub fn log_message(message: &str, level: Option<String>) {
    let level = level.unwrap_or_else(|| "info".to_string());

    match level.as_str() {
        "info" => log_info(message.to_string(), "[B]".to_string()),
        "warn" => log_warning(message.to_string(), "[B]".to_string()),
        "error" => log_error(message.to_string(), "[B]".to_string()),
        "debug" => log_debug(message.to_string(), "[B]".to_string()),
        _ => println!("Unknown log level: {}", level),
    }
}

fn log_info(message: String, origin: String) {
    println!("{}[INFO] {}", origin,  message);
}
fn log_warning(message: String, origin: String) {
    println!("{}[WARNING] {}", origin,  message);
}
fn log_error(message: String, origin: String) {
    println!("{}[ERROR] {}", origin,  message);
}
fn log_debug(message: String, origin: String) {
    println!("{}[DEBUG] {}", origin,  message);
}