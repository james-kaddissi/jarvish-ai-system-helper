import { DOM } from './core/constants.js';
import { appState } from './core/state.js';
import { setupMenuSystem } from './ui/menus.js';
import { setupWindowControls } from './ui/window-controls.js';
import { setupStreamingListeners } from './features/streaming.js';
import { setupKeyboardShortcuts } from './features/keyboard.js';
import { initializeApp } from './features/initialization.js';
import { sendPrompt, startNewConversation, onModelChange } from './features/chat.js';
import { abortStream } from './features/streaming.js';
import { showStatus } from './ui/status.js';
import { initializeConversationManager, saveCurrentConversationFromManager } from './features/conversations.js';
import { logMessage } from './core/tauri-api.js';
import { setupSidebar } from './features/sidebar.js';
import { initializeInteractables } from './features/interactable.js';

logMessage("J.A.R.V.I.S.H. interface loaded", "info");

function setupEventListeners() {
  if (DOM.sendBtn) {
    DOM.sendBtn.addEventListener("click", sendPrompt); // sendPrompt on button click
  }

  if (DOM.promptInput) {
    DOM.promptInput.addEventListener("keypress", (e) => { // allow submitting prompt with Enter key
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (appState.isGenerating) {  // enter during generation aborts the stream early
          abortStream();
        } else {
          sendPrompt();
        }
      }
    });
  }

  if (DOM.newConversationBtn) {
    DOM.newConversationBtn.addEventListener("click", startNewConversation); // start a new conversation
  }

  if (DOM.saveConversationBtn) {
    DOM.saveConversationBtn.addEventListener("click", async () => { // save the current conversation
      try {
        await saveCurrentConversationFromManager();
        showStatus("Conversation saved manually", "success");
        logMessage("Conversation saved manually", "info");
      } catch (error) {
        console.error("Error saving conversation:", error);
        showStatus("Failed to save conversation", "error");
      }
    });
  }

  if (DOM.modelSelector) {
    DOM.modelSelector.addEventListener("change", onModelChange); // attached to model dropdown
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  logMessage("Initializing application...", "info");
  
  try {  
    setupMenuSystem();
    setupSidebar();
    setupKeyboardShortcuts();
    setupWindowControls();
    setupStreamingListeners();
    setupEventListeners();
    initializeInteractables();
    
    await initializeApp();
    
    await initializeConversationManager();
    
    logMessage("Application initialized successfully");

    
  } catch (error) {
    console.error("Failed to initialize application:", error);
    showStatus("Failed to initialize application", "error");
  }
});