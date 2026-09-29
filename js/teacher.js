import { api, escapeHtml, logout, requireSession } from './api-client.js';

async function load() {
  try {
    const user = await requireSession('teacher');
    if (!user) return;
    document.getElementById('username').textContent = user.username;
    const data = await api('/api/teacher?action=overview');
    renderPhases(data.phases);
    renderResets(data.resets);
    renderStudents(data.students);
  } catch (error) {
    document.getElementById('phaseAdmin').innerHTML = `<div class="form-message error">${escapeHtml(error.message)}</div>`;
  }
}

function renderPhases(phases) {
  const root = document.getElementById('phaseAdmin');
  root.innerHTML = phases.map(phase => `
    <article class="admin-card">
      <strong>Fase ${phase.id} · ${escapeHtml(phase.title)}</strong>
      <span>${phase.completed} concluíram · ${phase.started} iniciaram</span>
      ${phase.developed
        ? `<label class="switch-row"><input type="checkbox" data-release="${phase.id}" ${phase.released ? 'checked' : ''}> Liberada</label>`
        : '<em>Ainda não desenvolvido</em>'}
    </article>`).join('');

  root.querySelectorAll('[data-release]').forEach(input => input.addEventListener('change', async () => {
    try {
      await api('/api/teacher?action=release', {
        method: 'POST',
        body: { phase_id: Number(input.dataset.release), released: input.checked }
      });
    } catch (error) {
      input.checked = !input.checked;
      alert(error.message);
    }
  }));
}

function renderResets(resets) {
  const root = document.getElementById('resetAdmin');
  if (!resets.length) {
    root.innerHTML = '<p class="muted">Nenhuma solicitação pendente.</p>';
    return;
  }

  root.innerHTML = resets.map(reset => `
    <article class="admin-card">
      <strong>${escapeHtml(reset.username)}</strong>
      <span>Solicitado em ${formatDate(reset.requested_at)}</span>
      <div class="reset-row">
        <input type="text" minlength="6" placeholder="Senha temporária" data-password-for="${reset.user_id}">
        <button type="button" data-reset="${reset.user_id}">Redefinir</button>
      </div>
    </article>`).join('');

  root.querySelectorAll('[data-reset]').forEach(button => button.addEventListener('click', async () => {
    const userId = Number(button.dataset.reset);
    const input = root.querySelector(`[data-password-for="${userId}"]`);
    try {
      await api('/api/teacher?action=reset-password', {
        method: 'POST',
        body: { user_id: userId, password: input.value }
      });
      await load();
    } catch (error) {
      alert(error.message);
    }
  }));
}

function renderStudents(students) {
  const root = document.getElementById('studentRows');
  if (!students.length) {
    root.innerHTML = '<tr><td colspan="5">Nenhum estudante cadastrado.</td></tr>';
    return;
  }
  root.innerHTML = students.map(student => `
    <tr>
      <td>${escapeHtml(student.username)}</td>
      <td>${student.completed} / 8</td>
      <td>${student.queries}</td>
      <td>${student.attempts}</td>
      <td>${student.last_login_at ? formatDate(student.last_login_at) : '—'}</td>
    </tr>`).join('');
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

document.getElementById('logout').addEventListener('click', event => {
  event.preventDefault();
  logout();
});

load();
