import { DOM, STATUS_TYPES } from '../core/constants.js';
import { appState, updatePreferences } from '../core/state.js';
import { saveEditorPreferences, applyEditorPreferences } from '../features/preferences.js';
import { showStatus } from './status.js';

export function showEditorPreferencesModal() {
  DOM.preferencesModal.style.display = 'flex';
  applyEditorPreferences();
}

export function hideEditorPreferencesModal() {
  DOM.preferencesModal.style.display = 'none';
}

export function setupPreferencesModal() {
  const closeBtn = document.querySelector('.modal-close');
  const saveBtn = document.getElementById('save-preferences');
  const cancelBtn = document.getElementById('cancel-preferences');
  const fontSizeSlider = document.getElementById('font-size-slider');
  const fontSizeValue = document.getElementById('font-size-value');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', hideEditorPreferencesModal);
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', hideEditorPreferencesModal);
  }
  
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const themeSelector = document.getElementById('theme-selector');
      const fontSizeSlider = document.getElementById('font-size-slider');
      const autoSaveCheckbox = document.getElementById('auto-save-checkbox');
      
      if (themeSelector && fontSizeSlider && autoSaveCheckbox) {
        const newPrefs = {
          theme: themeSelector.value,
          fontSize: parseInt(fontSizeSlider.value),
          autoSave: autoSaveCheckbox.checked
        };
        
        updatePreferences(newPrefs);
        saveEditorPreferences();
        hideEditorPreferencesModal();
        showStatus('Preferences saved', STATUS_TYPES.SUCCESS);
      }
    });
  }
  
  if (fontSizeSlider && fontSizeValue) {
    fontSizeSlider.addEventListener('input', (e) => {
      fontSizeValue.textContent = e.target.value + 'px';
    });
  }
  
  if (DOM.preferencesModal) {
    DOM.preferencesModal.addEventListener('click', (e) => {
      if (e.target === DOM.preferencesModal) {
        hideEditorPreferencesModal();
      }
    });
  }
}