import { DOM, MESSAGES, MESSAGE_TYPES, STATUS_TYPES } from '../core/constants.js';
import { logMessage, streamPrompt, resetContext } from '../core/tauri-api.js';
import { clearConversation, updateGenerationState, addToConversation, appState, setAvailableModels } from '../core/state.js';
import { addMessage, clearMessageHistory } from '../ui/messages.js';
import { showStatus } from '../ui/status.js';
import { abortStream } from './streaming.js';
import {
  createNewConversationFromManager,
  saveCurrentConversationFromManager,
  hasActiveConversation
} from './conversations.js';

export function updateSaveButtonState() {
  if (DOM.saveConversationBtn) {
    const hasConversation = hasActiveConversation() && appState.currentConversation.length > 0;
    DOM.saveConversationBtn.disabled = !hasConversation || appState.isGenerating;
  }
}

export async function startNewConversation() {
  clearConversation();
  clearMessageHistory();
  addMessage(MESSAGES.NEW_CONVERSATION, MESSAGE_TYPES.SYSTEM);

  try {
    await resetContext();
    logMessage("Context reset successfully");

    const newConversation = await createNewConversationFromManager();
    if (newConversation) {
      showStatus("New conversation started", STATUS_TYPES.INFO);
      updateSaveButtonState();
    }
  } catch (error) {
    console.error("Error starting new conversation:", error);
    addMessage("Error starting new conversation: " + error, MESSAGE_TYPES.ASSISTANT);
    showStatus("Error starting new conversation: " + error, STATUS_TYPES.ERROR);
  }

  DOM.promptInput.focus();
}

export async function sendPrompt() {
  const prompt = DOM.promptInput.value.trim();
  const selectedModel = DOM.modelSelector.value;

  if (!prompt || !selectedModel || appState.isGenerating) {
    return;
  }

  logMessage("Sending prompt:", prompt, "with model:", selectedModel);

  if (!hasActiveConversation()) {
    const newConversation = await createNewConversationFromManager();
    if (!newConversation) {
      logMessage("Failed to create new conversation");
      showStatus("Failed to create conversation", STATUS_TYPES.ERROR);
      return;
    }
  }

  addMessage(prompt, MESSAGE_TYPES.USER);
  DOM.promptInput.value = "";

  updateGenerationState(true);
  DOM.sendBtn.disabled = false;
  DOM.sendBtn.textContent = "⏹";
  DOM.sendBtn.onclick = abortStream;
  DOM.promptInput.disabled = true;

  updateSaveButtonState();

  try {
    await streamPrompt(prompt, selectedModel);
    logMessage("Streaming completed");

  } catch (error) {
    console.error("Error during streaming:", error);
    showStatus("Error: " + error, STATUS_TYPES.ERROR);

    if (appState.currentAssistantMessage) {
      const contentEl = appState.currentAssistantMessage.querySelector(".message-content");
      contentEl.textContent = "Error: " + error;
    } else {
      addMessage("Error: " + error, MESSAGE_TYPES.ASSISTANT);
    }

    finishGeneration();
  }
}

export async function finishGeneration() {
  if (appState.currentResponse) {
    addToConversation(MESSAGE_TYPES.ASSISTANT, appState.currentResponse);
  }

  updateGenerationState(false);
  DOM.sendBtn.disabled = false;
  DOM.sendBtn.textContent = "→";
  DOM.sendBtn.onclick = sendPrompt;
  DOM.promptInput.disabled = false;
  DOM.promptInput.focus();

  updateSaveButtonState();

  if (appState.editorPreferences.autoSave && hasActiveConversation()) {
    logMessage("Auto-saving conversation after generationnnnnnnnnnnnnnnnnnnnnn");
    try {
      await saveCurrentConversationFromManager();
    } catch (error) {
      console.error("Error auto saving conversation:", error);
    }
  }
}

export function populateModelSelector(models) {
  DOM.modelSelector.innerHTML = "";
  models.forEach(model => {
    const option = document.createElement("option");
    option.value = model;
    option.textContent = model;
    DOM.modelSelector.appendChild(option);
  });

  if (models.length > 0) {
    DOM.modelSelector.value = models[0];
  }
}

export function enableChatControls() {
  DOM.modelSelector.disabled = false;
  DOM.sendBtn.disabled = false;
  updateSaveButtonState();
}

export function onModelChange() {
  const selectedModel = DOM.modelSelector.value;
  if (selectedModel) {
    showStatus(`Switched to ${selectedModel}`, STATUS_TYPES.INFO);
  }
}