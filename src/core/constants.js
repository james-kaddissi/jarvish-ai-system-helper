export const DOM = {
  modelSelector: document.getElementById("model-selector"),
  newConversationBtn: document.getElementById("new-conversation-btn"),
  saveConversationBtn: document.getElementById("save-conversation-btn"),
  conversationHistory: document.getElementById("conversation-history"),
  promptInput: document.getElementById("prompt-input"),
  sendBtn: document.getElementById("send-btn"),
  footerText: document.getElementById("footer-text"),
  fileInput: document.getElementById("file-input"),
  preferencesModal: document.getElementById("preferences-modal"),
  pastConversationsList: document.getElementById("past-conversations-list"),
  
  minimizeBtn: document.getElementById("minimize-btn"),
  maximizeBtn: document.getElementById("maximize-btn"),
  closeBtn: document.getElementById("close-btn")
};

export const TIMEOUTS = {
  STATUS_DISPLAY: 3000
};

export const MESSAGES = {
  DEFAULT_FOOTER: "Powered by J.A.R.V.I.S.H.",
  NEW_CONVERSATION: "New conversation started",
  INITIALIZING: "Checking Ollama connection...",
  LOADING_MODELS: "Loading models...",
  READY: "Ready!",
  NO_MODELS: "No models found",
  SERVICE_NOT_RUNNING: "Ollama service not running"
};

export const STATUS_TYPES = {
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "error"
};

export const MESSAGE_TYPES = {
  USER: "user",
  ASSISTANT: "assistant",
  SYSTEM: "system"
};