import { DOM } from './core/constants.js';
import { appState } from './core/state.js';
import { setupMenuSystem } from './ui/menus.js';
import { setupPreferencesModal } from './ui/modals.js';
import { setupWindowControls } from './ui/window-controls.js';
import { setupStreamingListeners } from './features/streaming.js';
import { setupKeyboardShortcuts } from './features/keyboard.js';
import { loadEditorPreferences } from './features/preferences.js';
import { initializeApp } from './features/initialization.js';
import { sendPrompt, startNewConversation, onModelChange } from './features/chat.js';
import { abortStream } from './features/streaming.js';
import { showStatus } from './ui/status.js';
import { initializeConversationManager, saveCurrentConversationFromManager } from './features/conversations.js';

console.log("J.A.R.V.I.S.H. interface loaded");

function setupEventListeners() {
  if (DOM.sendBtn) {
    DOM.sendBtn.addEventListener("click", sendPrompt);
  }

  if (DOM.promptInput) {
    DOM.promptInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (appState.isGenerating) {
          abortStream();
        } else {
          sendPrompt();
        }
      }
    });
  }

  if (DOM.newConversationBtn) {
    DOM.newConversationBtn.addEventListener("click", startNewConversation);
  }

  if (DOM.saveConversationBtn) {
    DOM.saveConversationBtn.addEventListener("click", async () => {
      try {
        await saveCurrentConversationFromManager();
        showStatus("Conversation saved manually", "success");
      } catch (error) {
        console.error("Error saving conversation:", error);
        showStatus("Failed to save conversation", "error");
      }
    });
  }

  if (DOM.modelSelector) {
    DOM.modelSelector.addEventListener("change", onModelChange);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log("Initializing application...");
  
  try {
    await loadEditorPreferences();
    
    setupMenuSystem();
    setupPreferencesModal();
    setupKeyboardShortcuts();
    setupWindowControls();
    setupStreamingListeners();
    setupEventListeners();
    
    await initializeApp();
    
    await initializeConversationManager();
    
    console.log("Application initialized successfully");
  } catch (error) {
    console.error("Failed to initialize application:", error);
    showStatus("Failed to initialize application", "error");
  }
});