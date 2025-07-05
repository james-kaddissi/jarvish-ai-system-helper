export const appState = {
  availableModels: [],
  currentConversation: [],
  isGenerating: false,
  currentResponse: "",
  currentAssistantMessage: null,
  currentZoom: 1.0,
  statusTimeout: null,
  activeDropdown: null,
  
  editorPreferences: {
    theme: 'default',
    fontSize: 16,
    autoSave: false
  }
};

export function updateGenerationState(isGenerating, response = "", message = null) {
  appState.isGenerating = isGenerating;
  appState.currentResponse = response;
  appState.currentAssistantMessage = message;
}

export function addToConversation(type, content) {
  appState.currentConversation.push({
    type,
    content,
    timestamp: new Date().toISOString()
  });
}

export function clearConversation() {
  appState.currentConversation = [];
}

export function setActiveDropdown(dropdown) {
  appState.activeDropdown = dropdown;
}

export function clearActiveDropdown() {
  appState.activeDropdown = null;
}

export function updatePreferences(newPrefs) {
  Object.assign(appState.editorPreferences, newPrefs);
}

export function setAvailableModels(models) {
  appState.availableModels = models;
}

export function setStatusTimeout(timeout) {
  appState.statusTimeout = timeout;
}

export function clearStatusTimeout() {
  if (appState.statusTimeout) {
    clearTimeout(appState.statusTimeout);
    appState.statusTimeout = null;
  }
}