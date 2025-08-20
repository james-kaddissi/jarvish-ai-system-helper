export function setupSidebar() {
  const body = document.querySelector('body');
  const mainContainer = document.querySelector('.main-container');
  const qagent = document.querySelector('.qagent');
  const pastConversations = document.querySelector('.past-conversations-container');

  // start in chat layout
  body.classList.add('layout-chat');

  document.querySelectorAll('.sidebar-icon').forEach(icon => {
    icon.addEventListener('click', (event) => {
      const action = event.currentTarget.getAttribute('data-action');
      switchContent(action);
    });
  });

  function switchContent(action) {
    if (action === 'quick-chat') {
      body.classList.remove('layout-agent');
      body.classList.add('layout-chat');

      // show chat, show past conversations, hide agent
      mainContainer.hidden = false;
      if (pastConversations) pastConversations.hidden = false;
      if (qagent) qagent.hidden = true;

    } else if (action === 'quick-agent') {
      body.classList.remove('layout-chat');
      body.classList.add('layout-agent');

      // hide chat & past, show agent
      mainContainer.hidden = true;
      if (pastConversations) pastConversations.hidden = true;

      if (qagent) {
        qagent.hidden = true === false; // i.e., show it
      }
    }
  }
}
