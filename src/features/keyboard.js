import { DOM } from '../core/constants.js';
import { toggleMaximizeWindow } from '../core/tauri-api.js';
import { hideEditorPreferencesModal } from '../ui/modals.js';
import { closeActiveDropdown } from '../ui/menus.js';
import { appState } from '../core/state.js';

export function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        // add CTRL shortcuts here
      }
    }
    
    if (e.key === 'F11') {
      e.preventDefault();
      toggleMaximizeWindow();
    }
    
    if (e.key === 'Escape') {
      handleEscapeKey();
    }
  });
}

function handleEscapeKey() {
  if (DOM.preferencesModal && DOM.preferencesModal.style.display === 'flex') {
    hideEditorPreferencesModal();
    return;
  }
  
  if (appState.activeDropdown) {
    closeActiveDropdown();
    return;
  }
}