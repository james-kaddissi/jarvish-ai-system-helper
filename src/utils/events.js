export function addEventListener(element, event, handler, options = {}) {
  if (element) {
    element.addEventListener(event, handler, options);
  }
}

export function removeEventListener(element, event, handler, options = {}) {
  if (element) {
    element.removeEventListener(event, handler, options);
  }
}

export function preventDefault(event) {
  if (event) event.preventDefault();
}

export function stopPropagation(event) {
  if (event) event.stopPropagation();
}

export function stopImmediatePropagation(event) {
  if (event) event.stopImmediatePropagation();
}

export function createCustomEvent(eventName, detail = null) {
  return new CustomEvent(eventName, { detail });
}

export function dispatchCustomEvent(element, eventName, detail = null) {
  if (element) {
    const event = createCustomEvent(eventName, detail);
    element.dispatchEvent(event);
  }
}

export function debounce(func, wait, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
}

export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}