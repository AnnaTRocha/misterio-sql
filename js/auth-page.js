import { api, me } from './api-client.js';

const message = document.getElementById('message');

function show(text, type = 'error') {
  message.className = `form-message ${type}`;
  message.textContent = text;
}

function redirect(user) {
  if (user.must_change_password) return location.replace('/change-password.html');
  location.replace(user.role === 'teacher' ? '/teacher.html' : '/dashboard.html');
}

async function initial() {
  try {
    const { user } = await me();
    if (user) redirect(user);
  } catch (error) {
    if (/DATABASE_URL|SESSION_SECRET/i.test(error.message)) {
      show('O ambiente ainda não está configurado. Verifique DATABASE_URL e SESSION_SECRET na Vercel.');
    }
  }
}

async function submit(form, action) {
  const button = form.querySelector('button');
  button.disabled = true;
  try {
    const data = Object.fromEntries(new FormData(form));
    const result = await api(`/api/auth?action=${action}`, { method: 'POST', body: data });
    if (result.user) redirect(result.user);
    else show(result.message || 'Solicitação enviada.', 'success');
  } catch (error) {
    show(error.message);
  } finally {
    button.disabled = false;
  }
}

document.getElementById('loginForm').addEventListener('submit', event => {
  event.preventDefault();
  submit(event.currentTarget, 'login');
});

document.getElementById('registerForm').addEventListener('submit', event => {
  event.preventDefault();
  submit(event.currentTarget, 'register');
});

document.getElementById('resetForm').addEventListener('submit', event => {
  event.preventDefault();
  submit(event.currentTarget, 'request-reset');
});

initial();
