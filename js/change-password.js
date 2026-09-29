import { api, requireSession } from './api-client.js';

let currentUser;
const message = document.getElementById('message');

async function init() {
  currentUser = await requireSession();
  if (!currentUser) return;
  if (!currentUser.must_change_password) {
    location.replace(currentUser.role === 'teacher' ? '/teacher.html' : '/dashboard.html');
  }
}

document.getElementById('changeForm').addEventListener('submit', async event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  try {
    await api('/api/auth?action=change-password', { method: 'POST', body: data });
    location.replace(currentUser.role === 'teacher' ? '/teacher.html' : '/dashboard.html');
  } catch (error) {
    message.className = 'form-message error';
    message.textContent = error.message;
  }
});

init();
