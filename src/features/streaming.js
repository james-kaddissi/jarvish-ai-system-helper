import { logMessage, listen, abortStreamRequest } from '../core/tauri-api.js';
import { appState, updateGenerationState } from '../core/state.js';
import { createAssistantMessage, updateCurrentMessage } from '../ui/messages.js';
import { showStatus } from '../ui/status.js';
import { STATUS_TYPES } from '../core/constants.js';
import { finishGeneration } from './chat.js';

export function setupStreamingListeners() {
  listen("ollama-token", (event) => {
    if (!appState.currentAssistantMessage) {
      const messageEl = createAssistantMessage();
      updateGenerationState(appState.isGenerating, "", messageEl);
    }
    
    const newResponse = appState.currentResponse + event.payload;
    updateGenerationState(appState.isGenerating, newResponse, appState.currentAssistantMessage);
    updateCurrentMessage(newResponse);
  });

  listen("ollama-complete", (event) => {
    logMessage("Stream completed");
    finishGeneration();
  });

  listen("ollama-cancelled", (event) => {
    logMessage("Stream cancelled");
    
    if (appState.currentAssistantMessage) {
      const finalResponse = appState.currentResponse + " [Cancelled]";
      updateCurrentMessage(finalResponse);
    }
    
    finishGeneration();
    showStatus("Generation cancelled", STATUS_TYPES.WARNING);
  });

  listen("ollama-error", (event) => {
    logMessage("Stream error:", event.payload);
    
    if (appState.currentAssistantMessage) {
      const finalResponse = appState.currentResponse + " [Error: " + event.payload + "]";
      updateCurrentMessage(finalResponse);
    }
    
    finishGeneration();
    showStatus("Generation error", STATUS_TYPES.ERROR);
  });
}

export async function abortStream() {
  try {
    await abortStreamRequest();
    logMessage("Stream aborted");
    showStatus("Stream aborted", STATUS_TYPES.WARNING);
  } catch (e) {
    console.error("Error aborting stream:", e);
    showStatus("Error aborting stream", STATUS_TYPES.ERROR);
  }
}