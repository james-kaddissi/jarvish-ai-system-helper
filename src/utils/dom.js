export function createElement(tag, className = '', textContent = '') {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (textContent) element.textContent = textContent;
  return element;
}

export function querySelector(selector) {
  return document.querySelector(selector);
}

export function querySelectorAll(selector) {
  return document.querySelectorAll(selector);
}

export function getElementById(id) {
  return document.getElementById(id);
}

export function addClass(element, className) {
  if (element) element.classList.add(className);
}

export function removeClass(element, className) {
  if (element) element.classList.remove(className);
}

export function toggleClass(element, className) {
  if (element) element.classList.toggle(className);
}

export function hasClass(element, className) {
  return element ? element.classList.contains(className) : false;
}

export function setStyle(element, property, value) {
  if (element) element.style[property] = value;
}

export function appendTo(parent, child) {
  if (parent && child) parent.appendChild(child);
}

export function removeElement(element) {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}