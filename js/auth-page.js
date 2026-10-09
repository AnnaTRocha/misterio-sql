import { api, me } from './api-client.js';

const message = document.getElementById('message');
const registerMessage = document.getElementById('registerMessage');

function show(text, type = 'error', target = message) {
  target.hidden = false;
  target.className = `form-message ${type}`;
  target.textContent = text;
}

function validateRegistration(form) {
  const username = form.elements.namedItem('username');
  const password = form.elements.namedItem('password');
  const confirm = form.elements.namedItem('confirm');
  username.value = username.value.normalize('NFC').trim().replace(/\s+/gu, ' ');
  const length = Array.from(username.value).length;

  const invalid = (field, text) => {
    field.setAttribute('aria-invalid', 'true');
    show(text, 'error', registerMessage);
    field.focus();
    return false;
  };

  if (length < 3 || length > 30 || !/^[\p{L}\p{N} ._-]+$/u.test(username.value) || !/[\p{L}\p{N}]/u.test(username.value)) {
    return invalid(username, 'Nome de usuário: use de 3 a 30 caracteres, com ao menos uma letra ou número. São aceitos acentos, espaços, ponto, hífen e _.');
  }
  if (password.value.length < 6) return invalid(password, 'Senha: use pelo menos 6 caracteres.');
  if (password.value !== confirm.value) return invalid(confirm, 'Confirmar senha: os dois valores não coincidem.');
  return true;
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
  const target = action === 'register' ? registerMessage : message;
  if (action === 'register') message.hidden = true;
  target.hidden = true;
  target.textContent = '';
  if (action === 'register' && !validateRegistration(form)) return;
  const button = form.querySelector('button');
  button.disabled = true;
  try {
    const data = Object.fromEntries(new FormData(form));
    const result = await api(`/api/auth?action=${action}`, { method: 'POST', body: data });
    if (result.user) redirect(result.user);
    else show(result.message || 'Solicitação enviada.', 'success', target);
  } catch (error) {
    show(error.message, 'error', target);
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

document.getElementById('registerForm').addEventListener('input', event => {
  if (event.target instanceof HTMLInputElement) event.target.removeAttribute('aria-invalid');
  registerMessage.hidden = true;
});

document.getElementById('resetForm').addEventListener('submit', event => {
  event.preventDefault();
  submit(event.currentTarget, 'request-reset');
});

initial();
