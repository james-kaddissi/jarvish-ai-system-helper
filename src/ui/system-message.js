import { logMessage } from "../core/tauri-api";

export class SystemMessageManager {
    constructor() {
    this.currentMessage = '';
    this.typewriterSpeed = 30;
    this.isTyping = false;
    this.hideTimeout = null;

    this.area = null;
    this.icon = null;
    this.content = null;
    this.cursor = null;
  }

  initialize() {
    this.area = document.getElementById('system-message-area');
    this.icon = document.getElementById('system-message-icon');
    this.content = document.getElementById('system-message-content');
    this.cursor = document.getElementById('system-message-cursor');
    
    if (!this.area) {
      console.warn('System message area not found - creating it');
      this.createSystemMessageArea();
    }
    
    logMessage('System message manager initialized', 'info');
  }

  createSystemMessageArea() {
    // Create the system message area if it doesn't exist
    const area = document.createElement('div');
    area.id = 'system-message-area';
    area.className = 'system-message-area hidden';
    
    area.innerHTML = `
      <div class="system-message-content">
        <div id="system-message-icon" class="system-message-icon">
          <span>●</span>
        </div>
        <div class="system-message-text">
          <div id="system-message-typewriter" class="typewriter-container">
            <span id="system-message-content" class="typewriter-text"></span>
            <span id="system-message-cursor" class="typewriter-cursor"></span>
          </div>
        </div>
      </div>
    `;
    
    // Insert at the top of the messages container or main content area
    const messagesContainer = document.getElementById('messages') || document.body;
    messagesContainer.parentNode.insertBefore(area, messagesContainer);
    
    // Re-initialize DOM references
    this.initialize();
  }

  async show(message, type = 'info', duration = 4000) {
    if (this.isTyping) {
      // Queue the message if currently typing
      setTimeout(() => this.show(message, type, duration), 100);
      return;
    }

    try {
      // Clear any existing hide timeout
      if (this.hideTimeout) {
        clearTimeout(this.hideTimeout);
        this.hideTimeout = null;
      }

      // If there's already a message, type it out first
      if (this.currentMessage && this.currentMessage !== message) {
        await this.typeOut();
        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Show the area if hidden
      this.area.classList.remove('hidden');
      
      // Set icon type and add pulse effect
      this.icon.className = `system-message-icon ${type}`;
      this.pulse();
      
      // Type in the new message
      await this.typeIn(message);
      
      // Hide cursor after typing
      this.cursor.style.display = 'none';
      
      // Auto-hide after duration if specified
      if (duration > 0) {
        this.hideTimeout = setTimeout(() => {
          this.hide();
        }, duration);
      }

      logMessage(`System message shown: ${message}`, 'info');
      
    } catch (error) {
      console.error('Error showing system message:', error);
    }
  }

  async typeIn(message) {
    if (this.isTyping) return;
    
    this.isTyping = true;
    this.cursor.style.display = 'inline-block';
    this.content.textContent = '';
    
    try {
      for (let i = 0; i <= message.length; i++) {
        if (!this.isTyping) break; // Allow interruption
        
        this.content.textContent = message.substring(0, i);
        await new Promise(resolve => setTimeout(resolve, this.typewriterSpeed));
      }
      
      this.currentMessage = message;
    } finally {
      this.isTyping = false;
    }
  }

  async typeOut() {
    if (this.isTyping || !this.currentMessage) return;
    
    this.isTyping = true;
    this.cursor.style.display = 'inline-block';
    const message = this.content.textContent;
    
    try {
      for (let i = message.length; i >= 0; i--) {
        if (!this.isTyping) break; // Allow interruption
        
        this.content.textContent = message.substring(0, i);
        await new Promise(resolve => setTimeout(resolve, this.typewriterSpeed / 2));
      }
      
      this.currentMessage = '';
    } finally {
      this.isTyping = false;
    }
  }

  async hide() {
    try {
      if (this.hideTimeout) {
        clearTimeout(this.hideTimeout);
        this.hideTimeout = null;
      }

      if (this.currentMessage) {
        await this.typeOut();
      }
      
      this.area.classList.add('hidden');
      logMessage('System message hidden', 'info');
    } catch (error) {
      console.error('Error hiding system message:', error);
    }
  }

  pulse() {
    this.area.classList.add('pulse');
    setTimeout(() => this.area.classList.remove('pulse'), 600);
  }

  // Convenience methods for different message types
  showInfo(message, duration = 4000) {
    return this.show(message, 'info', duration);
  }

  showSuccess(message, duration = 3000) {
    return this.show(message, 'success', duration);
  }

  showWarning(message, duration = 5000) {
    return this.show(message, 'warning', duration);
  }

  showError(message, duration = 6000) {
    return this.show(message, 'error', duration);
  }

  // Show persistent message (doesn't auto-hide)
  showPersistent(message, type = 'info') {
    return this.show(message, type, 0);
  }

  // Update current message without retyping
  updateMessage(message, type = 'info') {
    if (this.currentMessage === message) return;
    
    this.icon.className = `system-message-icon ${type}`;
    this.content.textContent = message;
    this.currentMessage = message;
    this.cursor.style.display = 'none';
    
    if (this.area.classList.contains('hidden')) {
      this.area.classList.remove('hidden');
    }
    
    this.pulse();
  }
}

export const systemMessage = new SystemMessageManager();1