import { 
  logMessage,
  getConversations, 
  loadConversation, 
  deleteConversation, 
  createNewConversation, 
  saveConversation,
  updateConversationTitle 
} from '../core/tauri-api.js';
import { appState, updateGenerationState, clearConversation } from '../core/state.js';
import { DOM, MESSAGE_TYPES, STATUS_TYPES } from '../core/constants.js';
import { showStatus } from '../ui/status.js';
import { clearMessageHistory, addMessage } from '../ui/messages.js';
import { createElement } from '../utils/dom.js';
import { customConfirm } from '../ui/confirm-modal.js';

class ConversationManager {
  constructor() { // initialize properties to default values. pastConversationsList is a physical DOM element
    this.conversations = [];
    this.currentConversationId = null;
    this.pastConversationsList = document.getElementById('past-conversations-list');
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      await this.loadConversations();
      this.setupEventListeners();
      this.isInitialized = true;
      logMessage('Conversation manager initialized');
    } catch (error) {
      console.error('Failed to initialize conversation manager:', error);
      showStatus('Failed to load conversations', STATUS_TYPES.ERROR);
    }
  }

  async loadConversations() {
    try {
      this.conversations = await getConversations();
      this.renderConversationsList();
      logMessage(`Loaded ${this.conversations.length} conversations`);
    } catch (error) {
      console.error('Error loading conversations:', error);
      this.conversations = [];
      this.renderConversationsList();
    }
  }

  renderConversationsList() {
    if (!this.pastConversationsList) {
      console.warn('Past conversations list element not found');
      return;
    }

    this.pastConversationsList.innerHTML = '';

    if (this.conversations.length === 0) {
      const emptyItem = createElement('li', 'conversation-item empty');
      emptyItem.innerHTML = `
        <div class="conversation-preview">No conversations yet</div>
        <div class="conversation-date">Start a new conversation to get started</div>
      `;
      this.pastConversationsList.appendChild(emptyItem); // this shows when there is no conversation history
      return;
    }

    this.conversations.forEach(conversation => {
      const listItem = this.createConversationElement(conversation);
      this.pastConversationsList.appendChild(listItem);
    });
  }

  createConversationElement(conversation) {
    const listItem = createElement('li', 'conversation-item');
    listItem.dataset.conversationId = conversation.id;
    
    const date = new Date(conversation.updated_at);
    const formattedDate = this.formatDate(date);
    
    const preview = conversation.preview.length > 60 
      ? conversation.preview.substring(0, 60) + '...'
      : conversation.preview;

    listItem.innerHTML = `
      <div class="conversation-header">
        <div class="conversation-title">${this.escapeHtml(conversation.title)}</div>
        <div class="conversation-meta">
          <span class="conversation-model">${conversation.model}</span>
          <span class="conversation-count">${conversation.message_count} msgs</span>
        </div>
      </div>
      <div class="conversation-preview">${this.escapeHtml(preview)}</div>
      <div class="conversation-footer">
        <div class="conversation-date">${formattedDate}</div>
        <div class="conversation-tokens">${conversation.token_count} tokens</div>
      </div>
      <div class="conversation-actions">
        <button class="conversation-action-btn delete-btn" title="Delete conversation">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    `;

    listItem.addEventListener('click', (e) => {
      if (e.target.closest('.conversation-actions')) return;
      this.loadConversationById(conversation.id);
    });

    const deleteBtn = listItem.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteConversationById(conversation.id);
    });

    return listItem;
  }

  async loadConversationById(conversationId) {
    try {
      document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
      });
      
      const selectedItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
      if (selectedItem) {
        selectedItem.classList.add('active');
      }

      if (this.currentConversationId === conversationId) {
        logMessage('Conversation already loaded:', conversationId);
        return;
      }

      showStatus('Loading conversation...', STATUS_TYPES.INFO);
      
      try {
        const conversation = await loadConversation(conversationId);
        this.currentConversationId = conversationId;
        
        clearConversation();
        clearMessageHistory();
        
        conversation.messages.forEach(message => {
          appState.currentConversation.push({
            type: message.role,
            content: message.content,
            timestamp: message.timestamp
          });
        });
        
        this.displayConversationMessages(conversation.messages);
        
        if (DOM.modelSelector && conversation.model) {
          DOM.modelSelector.value = conversation.model;
        }

        showStatus(`Loaded conversation: ${conversation.title}`, STATUS_TYPES.SUCCESS);
        logMessage('Conversation loaded:', conversationId);
        
      } catch (loadError) {
        if (loadError.includes('Query returned no rows') || loadError.includes('Failed to load conversation')) {
          logMessage('Conversation not found in database, treating as new conversation');
          
          this.currentConversationId = conversationId;
          clearConversation();
          clearMessageHistory();
          
          addMessage('New conversation - send a message to save it', MESSAGE_TYPES.SYSTEM);
          showStatus('New conversation ready', STATUS_TYPES.INFO);
        } else {
          throw loadError;
        }
      }

    } catch (error) {
      console.error('Error loading conversation:', error);
      showStatus('Failed to load conversation', STATUS_TYPES.ERROR);
    }
  }

  displayConversationMessages(messages) {
    messages.forEach(message => {
      addMessage(message.content, message.role);
    });
  }

  async deleteConversationById(conversationId) {
    const confirmed = await customConfirm.show(
      'Are you sure you want to delete this conversation? This action cannot be undone.',
      'Delete Conversation'
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteConversation(conversationId);
      
      this.conversations = this.conversations.filter(conv => conv.id !== conversationId);
      
      this.renderConversationsList();
      
      if (this.currentConversationId === conversationId) {
        this.currentConversationId = null;
        clearConversation();
        clearMessageHistory();
        addMessage('Conversation deleted. Start a new conversation.', MESSAGE_TYPES.SYSTEM);
      }

      showStatus('Conversation deleted', STATUS_TYPES.SUCCESS);
      logMessage('Conversation deleted:', conversationId);

    } catch (error) {
      console.error('Error deleting conversation:', error);
      showStatus('Failed to delete conversation', STATUS_TYPES.ERROR);
    }
  }

  async startNewConversation() {
    try {
      const selectedModel = DOM.modelSelector?.value;
      if (!selectedModel) {
        showStatus('Please select a model first', STATUS_TYPES.WARNING);
        return null;
      }

      const newConversation = await createNewConversation(selectedModel);
      
      this.currentConversationId = newConversation.id;
      clearConversation();
      clearMessageHistory();
      
      document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
      });
      
      addMessage('New conversation started', MESSAGE_TYPES.SYSTEM);
      showStatus('New conversation created', STATUS_TYPES.SUCCESS);
      
      logMessage('New conversation created:', newConversation.id);
      return newConversation;

    } catch (error) {
      console.error('Error creating new conversation:', error);
      showStatus('Failed to create new conversation', STATUS_TYPES.ERROR);
      return null;
    }
  }

  async saveCurrentConversation() {
    if (!this.currentConversationId || appState.currentConversation.length === 0) {
      return;
    }

    try {
      const currentTitle = this.generateTitle();
      const conversation = {
        id: this.currentConversationId,
        title: currentTitle,
        messages: appState.currentConversation.map(msg => ({
          role: msg.type,
          content: msg.content,
          timestamp: msg.timestamp
        })),
        model: DOM.modelSelector?.value || 'unknown',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        token_count: this.estimateTokenCount()
      };

      await saveConversation({ conversation });
      
      const firstUserMessage = appState.currentConversation.find(msg => msg.type === 'user');
      if (firstUserMessage) {
        await updateConversationTitle({
          conversationId: this.currentConversationId,
          firstMessage: firstUserMessage.content
        });
      }
      
      await this.loadConversations();
      this.setActiveConversation(this.currentConversationId);
      
      logMessage('Conversation saved:', this.currentConversationId);

    } catch (error) {
      console.error('Error saving conversation:', error);
      showStatus('Failed to save conversation', STATUS_TYPES.ERROR);
    }
  }

  setActiveConversation(conversationId) {
    document.querySelectorAll('.conversation-item').forEach(item => {
      item.classList.remove('active');
    });
    
    const activeItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
    }
  }

  generateTitle() {
    const firstUserMessage = appState.currentConversation.find(msg => msg.type === 'user');
    if (firstUserMessage) {
      const content = firstUserMessage.content.trim();
      return content.length > 50 ? content.substring(0, 50) + '...' : content;
    }
    return 'New Conversation';
  }

  estimateTokenCount() {
    return appState.currentConversation.reduce((total, msg) => {
      return total + Math.ceil(msg.content.length / 4);
    }, 0);
  }

  setupEventListeners() {

  }

  async refreshConversations() {
    await this.loadConversations();
  }

  getCurrentConversationId() {
    return this.currentConversationId;
  }

  hasActiveConversation() {
    return this.currentConversationId !== null;
  }

  formatDate(date) {
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

export const conversationManager = new ConversationManager();

export async function initializeConversationManager() {
  await conversationManager.initialize();
}

export async function createNewConversationFromManager() {
  return await conversationManager.startNewConversation();
}

export async function saveCurrentConversationFromManager() {
  await conversationManager.saveCurrentConversation();
}

export function getCurrentConversationId() {
  return conversationManager.getCurrentConversationId();
}

export function hasActiveConversation() {
  return conversationManager.hasActiveConversation();
}