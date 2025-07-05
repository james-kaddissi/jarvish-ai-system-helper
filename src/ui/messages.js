import { DOM, MESSAGE_TYPES } from '../core/constants.js';
import { addToConversation, appState } from '../core/state.js';

export function createMessage(content, type = MESSAGE_TYPES.ASSISTANT) {
  const messageEl = document.createElement("div");
  messageEl.className = `message ${type}`;
  
  const contentEl = document.createElement("div");
  contentEl.className = "message-content";
  contentEl.textContent = content;
  
  messageEl.appendChild(contentEl);
  return messageEl;
}

export function addMessage(content, type = MESSAGE_TYPES.ASSISTANT) {
  const messageEl = createMessage(content, type);
  DOM.conversationHistory.appendChild(messageEl);
  scrollToBottom();
  
  addToConversation(type, content);
  
  if (appState.editorPreferences.autoSave && type === MESSAGE_TYPES.ASSISTANT) {
    // auto save TODO
  }
}

export function clearMessageHistory() {
  DOM.conversationHistory.innerHTML = "";
}

export function scrollToBottom() {
  DOM.conversationHistory.scrollTop = DOM.conversationHistory.scrollHeight;
}

export function updateCurrentMessage(content) {
  if (appState.currentAssistantMessage) {
    const contentEl = appState.currentAssistantMessage.querySelector(".message-content");
    contentEl.textContent = content;
    scrollToBottom();
  }
}

export function createAssistantMessage() {
  const messageEl = createMessage("", MESSAGE_TYPES.ASSISTANT);
  DOM.conversationHistory.appendChild(messageEl);
  return messageEl;
}