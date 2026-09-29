export async function api(path, options = {}) {
  const config = { credentials: 'same-origin', ...options };
  if (config.body && typeof config.body !== 'string') {
    config.headers = { 'Content-Type': 'application/json', ...(config.headers || {}) };
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(path, config);
  let data = {};
  try { data = await response.json(); } catch { /* resposta vazia */ }
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a operação.');
  return data;
}

export async function me() {
  return api('/api/auth?action=me');
}

export async function requireSession(role = null) {
  const { user } = await me();
  if (!user) {
    location.replace('/');
    return null;
  }
  if (user.must_change_password && !location.pathname.endsWith('/change-password.html')) {
    location.replace('/change-password.html');
    return null;
  }
  if (role && user.role !== role) {
    location.replace(user.role === 'teacher' ? '/teacher.html' : '/dashboard.html');
    return null;
  }
  return user;
}

export async function logout() {
  await api('/api/auth?action=logout', { method: 'POST', body: {} });
  location.replace('/');
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
