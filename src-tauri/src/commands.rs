use crate::ollama_service::{OllamaService, ModelInfo};
use std::collections::HashMap;
use crate::ConversationState;
use serde_json::Value;
use serde::{Deserialize, Serialize};
use futures_util::StreamExt;
use tauri::{Emitter, Window, AppHandle, Manager};
use tokio_util::sync::CancellationToken;
use rusqlite::{params, Connection, Result as SqlResult};
use chrono::Utc;
use rand::Rng;
use std::path::PathBuf;
use crate::logger::process_log; 

fn get_app_data_dir(app_handle: &AppHandle) -> Result<PathBuf, String> {
    app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ConversationMessage {
    pub role: String, // "user" | "assistant" | "system"
    pub content: String,
    pub timestamp: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub messages: Vec<ConversationMessage>,
    pub model: String,
    pub created_at: String,
    pub updated_at: String,
    pub token_count: i64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ConversationPreview {
    pub id: String,
    pub title: String,
    pub preview: String,
    pub model: String,
    pub created_at: String,
    pub updated_at: String,
    pub token_count: i64,
    pub message_count: i64,
}

pub struct StreamState {
    pub cancellation_token: Option<CancellationToken>,
}

#[derive(Serialize, Deserialize)]
pub struct EditorPreferences {
    theme: String,
    font_size: i64,
    auto_save: bool,
}

#[tauri::command]
pub fn log_message(message: String, level: String) {
    process_log(message, level);
}

// main command for streaming a prompt to Ollama
#[tauri::command]
pub async fn stream_prompt(
    window: Window,
    prompt: String,
    model: String,
    system: Option<String>,
    template: Option<String>,
    images: Option<Vec<String>>,
    raw: Option<bool>,
    format: Option<String>,
    options: Option<HashMap<String, Value>>,
    state: tauri::State<'_, ConversationState>,
) -> Result<(), String> {
    println!("stream_prompt called with model: {} and prompt: {}", model, prompt);
    
    let context = state.context.lock().unwrap().clone();
    
    let cancellation_token = CancellationToken::new();
    
    { // set cancellation token in stream state
        let mut stream_state = state.stream_state.lock().await;
        stream_state.cancellation_token = Some(cancellation_token.clone());
    }
    
    let service = OllamaService::new(None);

    println!("Starting stream generation...");
    let response = service
        .generate_stream(
            &model,
            &prompt,
            context,
            system.as_deref(),
            template.as_deref(),
            images,
            raw,
            format.as_deref(),
            options,
        )
        .await?;

    println!("Got response, starting to process stream...");
    let mut stream = response.bytes_stream();

    loop {
        tokio::select! {
            _ = cancellation_token.cancelled() => {
                println!("Stream was cancelled");
                window.emit("ollama-cancelled", "Stream cancelled by user").map_err(|e| e.to_string())?;
                break;
            }
            // process the stream items as long as we are not cancelled
            item = stream.next() => {
                match item {
                    Some(Ok(chunk)) => {
                        if let Ok(text) = std::str::from_utf8(&chunk) {
                            for line in text.lines() {
                                let line = line.trim();
                                if !line.is_empty() {
                                    if let Ok(v) = serde_json::from_str::<Value>(line) {
                                        // if the line is valid response token, emit the token to the frontend
                                        if let Some(token) = v.get("response").and_then(|r| r.as_str()) {
                                            println!("Emitting token: {}", token);
                                            window.emit("ollama-token", token).map_err(|e| e.to_string())?;
                                        }
                                        if let Some(new_context) = v.get("context").and_then(|c| c.as_array()) {
                                            let context_bytes: Vec<u8> = new_context
                                                .iter()
                                                .filter_map(|x| x.as_u64().map(|n| n as u8))
                                                .collect();
                                            *state.context.lock().unwrap() = Some(context_bytes);
                                        }
                                        // check if the stream is done, and end the stream if so
                                        if let Some(done) = v.get("done").and_then(|d| d.as_bool()) {
                                            if done {
                                                println!("Streaming completed");
                                                window.emit("ollama-complete", "Stream completed").map_err(|e| e.to_string())?;
                                                break;
                                            }
                                        }
                                    } else {
                                        println!("Failed to parse JSON line: {}", line);
                                    }
                                }
                            }
                        }
                    }
                    Some(Err(e)) => {
                        let error_msg = format!("Stream error: {}", e);
                        println!("{}", error_msg);
                        window.emit("ollama-error", &error_msg).map_err(|e| e.to_string())?;
                        break;
                    }
                    None => {
                        println!("Stream ended");
                        break;
                    }
                }
            }
        }
    }

    // reset the cancellation token in stream state after processing
    {
        let mut stream_state = state.stream_state.lock().await;
        stream_state.cancellation_token = None;
    }

    Ok(())
}

// command to abort an ongoing stream
// this will trigger the cancellation token to stop the stream processing
#[tauri::command]
pub async fn abort_stream(state: tauri::State<'_, ConversationState>) -> Result<(), String> {
    println!("abort_stream called");
    
    let stream_state = state.stream_state.lock().await;
    if let Some(token) = &stream_state.cancellation_token {
        token.cancel();
        println!("Cancellation token triggered");
        Ok(())
    } else {
        Err("No active stream to abort".to_string())
    }
}

// command to reset the context stored in the state
// this is useful for clearing any context that might have been set during streaming
#[tauri::command]
pub fn reset_context(state: tauri::State<'_, ConversationState>) {
    *state.context.lock().unwrap() = None;
}

// command to get available models from Ollama
// this will call the OllamaService to fetch the list of models and return them to the frontend
#[tauri::command]
pub async fn get_available_models() -> Result<Vec<String>, String> {
    println!("get_available_models called");
    
    let ollama = OllamaService::new(None);
    ollama.get_models().await
}

#[tauri::command]
pub async fn get_model_info(model_name: String) -> Result<ModelInfo, String> {
    println!("get_model_info called for model: {}", model_name);
    
    let ollama = OllamaService::new(None);
    ollama.get_model_info(&model_name).await
}

// gets the health status of the Ollama service
#[tauri::command]
pub async fn check_ollama_status() -> Result<bool, String> {
    println!("check_ollama_status called");
    
    let ollama = OllamaService::new(None);
    Ok(ollama.check_health().await)
}

// command to save editor preferences to a local SQLite database
#[tauri::command]
pub fn save_editor_preferences(app_handle: AppHandle, prefs: EditorPreferences) -> Result<(), String> {
    println!("save_editor_preferences called");
    
    let app_data_dir = get_app_data_dir(&app_handle)?;
    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    
    let db_path = app_data_dir.join("editor_preferences.db");
    let conn = Connection::open(db_path)
        .map_err(|e| e.to_string())?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS editor_preferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            theme TEXT,
            font_size INTEGER,
            auto_save BOOLEAN
        )",
        [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO editor_preferences (id, theme, font_size, auto_save) VALUES (1, ?, ?, ?)",
        params![prefs.theme, prefs.font_size, prefs.auto_save as i64],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

// command to load editor preferences from the local SQLite database
#[tauri::command]
pub fn load_editor_preferences(app_handle: AppHandle) -> Result<EditorPreferences, String> {
    println!("load_editor_preferences called");
    let app_data_dir = get_app_data_dir(&app_handle)?;
    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    
    let db_path = app_data_dir.join("editor_preferences.db");
    let conn = Connection::open(db_path)
        .map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS editor_preferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            theme TEXT,
            font_size INTEGER,
            auto_save BOOLEAN
        )",
        [],
    ).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT theme, font_size, auto_save FROM editor_preferences WHERE id = 1")
        .map_err(|e| e.to_string())?;

    let mut rows = stmt.query([])
        .map_err(|e| e.to_string())?;
    
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        Ok(EditorPreferences {
            theme: row.get(0).map_err(|e| e.to_string())?,
            font_size: row.get(1).map_err(|e| e.to_string())?,
            auto_save: row.get::<_, i64>(2).map_err(|e| e.to_string())? != 0,
        })
    } else {
        Ok(EditorPreferences {
            theme: "default".to_string(),
            font_size: 16,
            auto_save: true,
        })
    }
}

fn init_conversations_db(app_handle: &AppHandle) -> SqlResult<Connection> {
    let app_data_dir = get_app_data_dir(app_handle)
        .map_err(|e| rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CANTOPEN),
            Some(e)
        ))?;

    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CANTOPEN),
            Some(format!("Failed to create app data directory: {}", e))
        ))?;
    let db_path = app_data_dir.join("conversations.db");
    let conn = Connection::open(db_path)?;
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            model TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            token_count INTEGER DEFAULT 0
        )",
        [],
    )?;
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            position INTEGER NOT NULL,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        )",
        [],
    )?;
    
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_messages_conversation 
         ON messages (conversation_id, position)",
        [],
    )?;
    
    Ok(conn)
}

fn estimate_token_count(text: &str) -> i64 {
    (text.len() as f64 / 4.0).ceil() as i64
}

fn generate_title(first_message: &str) -> String {
    let max_length = 50;
    let cleaned = first_message.trim();
    
    if cleaned.len() <= max_length {
        cleaned.to_string()
    } else {
        format!("{}...", &cleaned[..max_length])
    }
}

#[tauri::command]
pub async fn save_conversation(app_handle: AppHandle, conversation: Conversation) -> Result<String, String> {
    println!("save_conversation called for conversation: {}", conversation.id);
    
    let conn = init_conversations_db(&app_handle)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    let tx = conn.unchecked_transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;
    
    let total_tokens: i64 = conversation.messages.iter()
        .map(|msg| estimate_token_count(&msg.content))
        .sum();
    
    tx.execute(
        "INSERT OR REPLACE INTO conversations (id, title, model, created_at, updated_at, token_count) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            &conversation.id,
            &conversation.title,
            &conversation.model,
            &conversation.created_at,
            &conversation.updated_at,
            total_tokens
        ],
    ).map_err(|e| format!("Failed to save conversation: {}", e))?;
    
    tx.execute(
        "DELETE FROM messages WHERE conversation_id = ?1",
        params![&conversation.id],
    ).map_err(|e| format!("Failed to delete old messages: {}", e))?;
    
    for (position, message) in conversation.messages.iter().enumerate() {
        tx.execute(
            "INSERT INTO messages (conversation_id, role, content, timestamp, position) 
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                &conversation.id,
                &message.role,
                &message.content,
                &message.timestamp,
                position as i64
            ],
        ).map_err(|e| format!("Failed to save message: {}", e))?;
    }
    
    tx.commit()
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;
    
    Ok(conversation.id)
}


#[tauri::command]
pub async fn get_conversations(app_handle: AppHandle) -> Result<Vec<ConversationPreview>, String> {
    println!("get_conversations called");
    
    let conn = init_conversations_db(&app_handle)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    let mut stmt = conn.prepare(
        "SELECT c.id, c.title, c.model, c.created_at, c.updated_at, c.token_count,
                COUNT(m.id) as message_count,
                (SELECT content FROM messages 
                 WHERE conversation_id = c.id 
                 ORDER BY position DESC LIMIT 1) as last_message
         FROM conversations c
         LEFT JOIN messages m ON c.id = m.conversation_id
         GROUP BY c.id
         ORDER BY c.updated_at DESC"
    ).map_err(|e| format!("Failed to prepare statement: {}", e))?;
    
    let conversations = stmt.query_map([], |row| {
        let last_message: Option<String> = row.get(7)?;
        let preview = last_message.unwrap_or_else(|| "Empty conversation".to_string());
        
        Ok(ConversationPreview {
            id: row.get(0)?,
            title: row.get(1)?,
            model: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
            token_count: row.get(5)?,
            message_count: row.get(6)?,
            preview: if preview.len() > 100 {
                format!("{}...", &preview[..100])
            } else {
                preview
            },
        })
    }).map_err(|e| format!("Failed to query conversations: {}", e))?;
    
    let mut result = Vec::new();
    for conv in conversations {
        result.push(conv.map_err(|e| format!("Failed to map conversation: {}", e))?);
    }
    
    Ok(result)
}

#[tauri::command]
pub async fn load_conversation(app_handle: AppHandle, conversation_id: String) -> Result<Conversation, String> {
    println!("load_conversation called for id: {}", conversation_id);
    
    let conn = init_conversations_db(&app_handle)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    let conv = conn.query_row(
        "SELECT id, title, model, created_at, updated_at, token_count 
         FROM conversations WHERE id = ?1",
        params![&conversation_id],
        |row| {
            Ok(Conversation {
                id: row.get(0)?,
                title: row.get(1)?,
                model: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                token_count: row.get(5)?,
                messages: Vec::new(),
            })
        }
    ).map_err(|e| format!("Failed to load conversation: {}", e))?;
    
    let mut stmt = conn.prepare(
        "SELECT role, content, timestamp 
         FROM messages 
         WHERE conversation_id = ?1 
         ORDER BY position ASC"
    ).map_err(|e| format!("Failed to prepare messages query: {}", e))?;
    
    let messages = stmt.query_map(params![&conversation_id], |row| {
        Ok(ConversationMessage {
            role: row.get(0)?,
            content: row.get(1)?,
            timestamp: row.get(2)?,
        })
    }).map_err(|e| format!("Failed to query messages: {}", e))?;
    
    let mut conv = conv;
    for msg in messages {
        conv.messages.push(msg.map_err(|e| format!("Failed to map message: {}", e))?);
    }
    
    Ok(conv)
}

#[tauri::command]
pub async fn delete_conversation(app_handle: AppHandle, conversation_id: String) -> Result<(), String> {
    println!("delete_conversation called for id: {}", conversation_id);
    
    let conn = init_conversations_db(&app_handle)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    conn.execute(
        "DELETE FROM conversations WHERE id = ?1",
        params![&conversation_id],
    ).map_err(|e| format!("Failed to delete conversation: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn create_new_conversation(model: String) -> Result<Conversation, String> {
    let timestamp = Utc::now().timestamp_millis();
    let random: u32 = rand::thread_rng().gen();
    let id = format!("conv-{}-{:x}", timestamp, random);
    
    let now = Utc::now().to_rfc3339();
    
    Ok(Conversation {
        id,
        title: "New Conversation".to_string(),
        messages: Vec::new(),
        model,
        created_at: now.clone(),
        updated_at: now,
        token_count: 0,
    })
}

#[tauri::command]
pub async fn update_conversation_title(app_handle: AppHandle, conversation_id: String, first_message: String) -> Result<(), String> {
    let conn = init_conversations_db(&app_handle)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    let title = generate_title(&first_message);
    
    conn.execute(
        "UPDATE conversations SET title = ?1 WHERE id = ?2",
        params![&title, &conversation_id],
    ).map_err(|e| format!("Failed to update title: {}", e))?;
    
    Ok(())
}