mod commands;
mod ollama_service;

use std::sync::Mutex;
use tokio::sync::Mutex as AsyncMutex;
use tokio_util::sync::CancellationToken;

pub struct ConversationState {
    pub context: Mutex<Option<Vec<u8>>>,
    pub stream_state: AsyncMutex<StreamState>,
}

pub struct StreamState {
    pub cancellation_token: Option<CancellationToken>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(ConversationState { 
            context: Mutex::new(None),
            stream_state: AsyncMutex::new(StreamState {
                cancellation_token: None,
            }),
        })
        .invoke_handler(tauri::generate_handler![
            commands::stream_prompt,
            commands::abort_stream,
            commands::reset_context,
            commands::get_available_models,
            commands::check_ollama_status,
            commands::save_editor_preferences,
            commands::load_editor_preferences,
            commands::save_conversation,
            commands::get_conversations,
            commands::load_conversation,
            commands::delete_conversation,
            commands::create_new_conversation,
            commands::update_conversation_title
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
        
    println!("Tauri application has ended");
}