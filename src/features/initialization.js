import { checkOllamaStatus, getAvailableModels } from '../core/tauri-api.js';
import { setAvailableModels } from '../core/state.js';
import { addMessage } from '../ui/messages.js';
import { showStatus } from '../ui/status.js';
import { populateModelSelector, enableChatControls } from './chat.js';
import { MESSAGES, MESSAGE_TYPES, STATUS_TYPES } from '../core/constants.js';

export async function initializeApp() {
  try {
    showStatus(MESSAGES.INITIALIZING, STATUS_TYPES.INFO);
    
    const isRunning = await checkOllamaStatus();
    if (!isRunning) {
      showStatus(MESSAGES.SERVICE_NOT_RUNNING, STATUS_TYPES.ERROR);
      addMessage("⚠️ Ollama service is not running. Please start Ollama first.", MESSAGE_TYPES.SYSTEM);
      return;
    }
    
    showStatus(MESSAGES.LOADING_MODELS, STATUS_TYPES.INFO);
    const availableModels = await getAvailableModels();
    
    if (availableModels.length === 0) {
      showStatus(MESSAGES.NO_MODELS, STATUS_TYPES.WARNING);
      addMessage("⚠️ No models found. Please install a model first (e.g., ollama pull llama3.2)", MESSAGE_TYPES.SYSTEM);
      return;
    }
    
    setAvailableModels(availableModels);
    populateModelSelector(availableModels);
    
    enableChatControls();
    
    showStatus(MESSAGES.READY, STATUS_TYPES.SUCCESS);
    addMessage(`✅ Connected to Ollama. ${availableModels.length} models available.`, MESSAGE_TYPES.SYSTEM);
    
  } catch (error) {
    console.error("Error initializing app:", error);
    showStatus("Failed to connect to Ollama", STATUS_TYPES.ERROR);
    addMessage("❌ Error connecting to Ollama: " + error, MESSAGE_TYPES.SYSTEM);
  }
}