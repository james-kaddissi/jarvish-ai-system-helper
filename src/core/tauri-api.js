const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;
const { getCurrentWindow } = window.__TAURI__.window;

export { invoke, listen, getCurrentWindow };

export async function checkOllamaStatus() {
  return await invoke("check_ollama_status");
}

export async function getAvailableModels() {
  return await invoke("get_available_models");
}

export async function streamPrompt(prompt, model) {
  return await invoke("stream_prompt", { prompt, model });
}

export async function abortStreamRequest() {
  return await invoke("abort_stream");
}

export async function resetContext() {
  return await invoke("reset_context");
}

export async function loadEditorPreferencesFromDb() {
  return await invoke("load_editor_preferences");
}

export async function saveEditorPreferencesToDb(prefs) {
  return await invoke("save_editor_preferences", { prefs });
}

export async function saveConversation(conversation) {
  return await invoke("save_conversation", conversation);
}

export async function getConversations() {
  return await invoke("get_conversations");
}

export async function loadConversation(conversationId) {
  return await invoke("load_conversation", { conversationId });
}

export async function deleteConversation(conversationId) {
  return await invoke("delete_conversation", { conversationId });
}

export async function createNewConversation(model) {
  return await invoke("create_new_conversation", { model });
}

export async function updateConversationTitle(conversationId, firstMessage) {
  return await invoke("update_conversation_title", { conversationId, firstMessage });
}

export async function minimizeWindow() {
  return await getCurrentWindow().minimize();
}

export async function toggleMaximizeWindow() {
  return await getCurrentWindow().toggleMaximize();
}

export async function closeWindow() {
  return await getCurrentWindow().close();
}