import { setActiveDropdown, clearActiveDropdown, appState } from '../core/state.js';
import { logMessage, closeWindow } from '../core/tauri-api.js';
import { startNewConversation } from '../features/chat.js';
import { saveCurrentConversationFromManager } from '../features/conversations.js';
import { showStatus } from './status.js';
import { STATUS_TYPES } from '../core/constants.js';

export function setupMenuSystem() {
  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const menuType = item.getAttribute('data-menu');
      const dropdown = document.getElementById(menuType + '-menu');
      
      if (appState.activeDropdown && appState.activeDropdown !== dropdown) {
        appState.activeDropdown.classList.remove('show');
        document.querySelector(`[data-menu="${appState.activeDropdown.id.replace('-menu', '')}"]`).classList.remove('active');
      }
      
      if (dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
        item.classList.remove('active');
        clearActiveDropdown();
      } else {
        dropdown.classList.add('show');
        item.classList.add('active');
        setActiveDropdown(dropdown);
      }
    });
  });
  
  document.querySelectorAll('.menu-option').forEach(option => {
    option.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const action = option.getAttribute('data-action');
      handleMenuAction(action);
      
      if (appState.activeDropdown) {
        appState.activeDropdown.classList.remove('show');
        document.querySelector(`[data-menu="${appState.activeDropdown.id.replace('-menu', '')}"]`).classList.remove('active');
        clearActiveDropdown();
      }
    });
  });
  
  document.addEventListener('click', (e) => {
    if (appState.activeDropdown && !e.target.closest('.menu-container')) {
      appState.activeDropdown.classList.remove('show');
      document.querySelector(`[data-menu="${appState.activeDropdown.id.replace('-menu', '')}"]`).classList.remove('active');
      clearActiveDropdown();
    }
  });
}

async function handleMenuAction(action) {
  logMessage('Menu action:', action);
  
  switch (action) {
    case 'new-conversation':
      await startNewConversation();
      break;
      
    case 'save-conversation':
      try {
        await saveCurrentConversationFromManager();
        showStatus("Conversation saved successfully", STATUS_TYPES.SUCCESS);
      } catch (error) {
        showStatus("Failed to save conversation", STATUS_TYPES.ERROR);
      }
      break;
      
    case 'exit':
      await closeWindow();
      break;
      
    default:
      showStatus(`Action "${action}" not implemented yet`, STATUS_TYPES.WARNING);
  }
}

export function closeActiveDropdown() {
  if (appState.activeDropdown) {
    appState.activeDropdown.classList.remove('show');
    document.querySelector(`[data-menu="${appState.activeDropdown.id.replace('-menu', '')}"]`).classList.remove('active');
    clearActiveDropdown();
  }
}