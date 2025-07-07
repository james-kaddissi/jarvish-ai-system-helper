class CustomConfirmDialog {
  constructor() {
    this.modal = null;
    this.messageElement = null;
    this.resolvePromise = null;
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;
    
    this.modal = document.getElementById('confirmModal');
    this.messageElement = document.getElementById('confirmMessage');
    
    if (!this.modal || !this.messageElement) {
      console.error('Custom confirm modal elements not found in DOM');
      return;
    }

    this.setupEventListeners();
    this.initialized = true;
  }

  setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal?.classList.contains('show')) {
        this.hide(false);
      }
    });

    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hide(false);
      }
    });

    this.modal.querySelector('.modal-content')?.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  show(message = 'Are you sure you want to delete this conversation?', title = 'Confirm Deletion') {
    if (!this.initialized) {
      this.initialize();
    }

    if (!this.modal) {
      return Promise.resolve(confirm(message));
    }

    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      
      if (this.messageElement) {
        this.messageElement.textContent = message;
      }
      
      const titleElement = this.modal.querySelector('.modal-title');
      if (titleElement) {
        titleElement.textContent = title;
      }

      this.modal.classList.add('show');
      
      setTimeout(() => {
        const cancelBtn = this.modal.querySelector('.modal-btn-cancel');
        if (cancelBtn) cancelBtn.focus();
      }, 100);
    });
  }

  hide(confirmed) {
    if (this.modal) {
      this.modal.classList.remove('show');
    }
    
    if (this.resolvePromise) {
      this.resolvePromise(confirmed);
      this.resolvePromise = null;
    }
  }
}

export const customConfirm = new CustomConfirmDialog();

if (typeof window !== 'undefined') {
  window.customConfirm = customConfirm;
}