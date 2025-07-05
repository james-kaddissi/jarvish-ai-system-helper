import { appState, updatePreferences } from '../core/state.js';
import { loadEditorPreferencesFromDb, saveEditorPreferencesToDb } from '../core/tauri-api.js';

export async function loadEditorPreferences() {
  try {
    const saved = await loadEditorPreferencesFromDb();
    if (saved) {
      updatePreferences(saved);
    }
  } catch (error) {
    console.error("Error loading preferences:", error);
  }
}

export async function saveEditorPreferences() {
  try {
    await saveEditorPreferencesToDb(appState.editorPreferences);
    applyEditorPreferences();
  } catch (error) {
    console.error("Error saving preferences:", error);
  }
}

export function applyEditorPreferences() {
  const { fontSize, theme, autoSave } = appState.editorPreferences;
  
  document.body.style.fontSize = fontSize + 'px';
  
  document.body.className = theme;
  
  const themeSelector = document.getElementById('theme-selector');
  const fontSizeSlider = document.getElementById('font-size-slider');
  const fontSizeValue = document.getElementById('font-size-value');
  const autoSaveCheckbox = document.getElementById('auto-save-checkbox');
  
  if (themeSelector) themeSelector.value = theme;
  if (fontSizeSlider) fontSizeSlider.value = fontSize;
  if (fontSizeValue) fontSizeValue.textContent = fontSize + 'px';
  if (autoSaveCheckbox) autoSaveCheckbox.checked = autoSave;
}