import { DOM } from '../core/constants.js';
import { logMessage, minimizeWindow, toggleMaximizeWindow, closeWindow } from '../core/tauri-api.js';

export function setupWindowControls() {
  if (DOM.minimizeBtn) {
    DOM.minimizeBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await minimizeWindow();
        logMessage("Window minimized");
      } catch (error) {
        console.error("Failed to minimize window:", error);
      }
    });
  }

  if (DOM.maximizeBtn) {
    DOM.maximizeBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await toggleMaximizeWindow();
        logMessage("Window maximize toggled");
      } catch (error) {
        console.error("Failed to toggle maximize:", error);
      }
    });
  }

  if (DOM.closeBtn) {
    DOM.closeBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await closeWindow();
        logMessage("Window closing");
      } catch (error) {
        console.error("Failed to close window:", error);
      }
    });
  }
}