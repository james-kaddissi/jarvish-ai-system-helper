# Just a Rather Very Intelligent System Helper

This is an application that provides much more useful functionality, optimizations and integrations to everyday LLM use. 
Cursor was meant to provide a similar use to coders, while JARVISH aims to bring this improved AI integration experience into 
everyones productivity, whether you are a student or professional.

## Overview

**Backend:** Rust with Tauri framework
**Frontend:** Vanilla JavaScript, HTML, CSS with Tauri framework
**AI Integration:** Ollama local LLM models (APIs soon)
**Database:** SQLite for main storage, Qdrant for vectors

src/
├── index.html
├── main.js
├── styles.css
├── core/
│   ├── constants.js
│   ├── state.js
│   ├── tauri-api.js
├── features/
│   ├── chat.js
│   ├── conversations.js
│   ├── initialization.js
│   ├── keyboard.js
│   ├── preferences.js
│   ├── streaming.js
├── ui/
│   ├── menus.js
│   ├── messages.js
│   ├── modals.js
│   ├── status.js
│   ├── window-controls.js
├── utils/
│   ├── dom.js
│   ├── events.js
└── assets/

src-tauri/
├── build.rs
├── src/
│   ├── commands.js
│   ├── lib.js
│   ├── main.js
│   ├── ollama_service.js
└── icons/

### Backend (src-tauri)

commands.rs: this is where tauri commands are declared and exposed to the frontend
ollama_service.rs: contains the OllamaService, abstracting interaction with ollama models
lib.rs: initializes the tauri app, second entry point, sets up commands and state management
main.rs: main entry point, calls run in lib.rs

### Frontend (src)

core/state.js: manages the state of the tauri app
core/tauri-api.js: wraps all backend functions and exposes for use in frontend 
core/constants.js: contains various relevant frontend constants
features/chat.js: manages the conversation flow, updates the UI, and send prompts to selected models
features/conversations.js: singleton conversation management, and manages past conversations list
features/streaming.js: sets up the event listeners for streaming ollama tokens, updates the messages, and handles context tokens
features/initialization.js: sets up services and initial ui states
features/keyboard.js: handles keyboard interactions- commands + shortcuts
features/preferences.js: manages and applies editor preferences
ui/menus.js: dropdown interaction, and action handling
ui/messages.js: creates message displays, and manages the past conversations lists
ui/modals.js: preferences modal management
ui/status.js: manages the bottom status bar
ui/window-controls.js: minimize, maximize, close and other window commands
utils/dom.js: abstraction for dom interactions
utils/events.js: abstraction for event interactions
main.js: Main entry point

#### EVENT FLOWS

Sending Messages:
1. User enters message and hits Enter/Send Button
2. Frontend validates input and model selection
3. Creates new conversation if needed (none is active)
4. Adds user message to UI
5. Calls stream_prompt command
6. Backend starts streaming from Ollama
7. Frontend receives tokens via ollama-token events
8. Updates assistant message in real-time
9. On completion, saves to conversation history
10. Auto-saves if enabled

Loading Conversations:
1. User clicks conversation in sidebar
2. Frontend calls load_conversation
3. Backend retrieves from SQLite
4. Messages displayed in conversation area
5. Model selector updated
6. Conversation marked as active

#### DATABASE SCHEMAS

Conversations:
```sql
CREATE TABLE conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    model TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    token_count INTEGER DEFAULT 0
)
```

Messages:
```sql
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    position INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
)
```

Editor Preferences:
```sql
CREATE TABLE editor_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    theme TEXT,
    font_size INTEGER,
    auto_save BOOLEAN
)
```

#### APP STATE (core/state.js)

```js
appState = {
  availableModels: [],
  currentConversation: [],
  isGenerating: false,
  currentResponse: "",
  currentAssistantMessage: null,
  editorPreferences: { theme, fontSize, autoSave }
}
```

