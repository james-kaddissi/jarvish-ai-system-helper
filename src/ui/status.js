import { DOM, TIMEOUTS, MESSAGES, STATUS_TYPES } from '../core/constants.js';
import { clearStatusTimeout, setStatusTimeout } from '../core/state.js';

export function showStatus(message, type = STATUS_TYPES.INFO) {
  clearStatusTimeout();
  
  DOM.footerText.textContent = message;
  DOM.footerText.className = `footer-text ${type}`;
  
  const timeout = setTimeout(() => {
    DOM.footerText.textContent = MESSAGES.DEFAULT_FOOTER;
    DOM.footerText.className = "footer-text";
    setStatusTimeout(null);
  }, TIMEOUTS.STATUS_DISPLAY);
  
  setStatusTimeout(timeout);
}