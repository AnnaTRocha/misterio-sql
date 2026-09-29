import { api, escapeHtml, logout, requireSession } from './api-client.js';

async function load() {
  try {
    const user = await requireSession('student');
    if (!user) return;
    document.getElementById('username').textContent = user.username;
    const { phases, progress } = await api('/api/game?action=dashboard');
    const progressByPhase = Object.fromEntries(progress.map(item => [Number(item.phase_id), item]));
    const completed = progress.filter(item => item.status === 'completed').length;

    document.getElementById('summary').innerHTML = `
      <strong>${completed} / 8</strong><span>fases concluídas</span>
      <div><i style="width:${(completed / 8) * 100}%"></i></div>`;

    document.getElementById('phases').innerHTML = phases.map(phase => {
      const item = progressByPhase[Number(phase.id)];
      const done = item?.status === 'completed';
      const locked = !phase.developed || !phase.released;
      let action;
      if (!phase.developed) action = '<span class="phase-state">Ainda não desenvolvido</span>';
      else if (!phase.released) action = '<span class="phase-state">🔒 Aguardando liberação do professor</span>';
      else action = `<a class="phase-link" href="phase.html?id=${phase.id}">${done ? '✓ Concluída · revisar' : 'Iniciar investigação →'}</a>`;

      const reward = done && phase.reward
        ? `<div class="reward">Evidência: <strong>${escapeHtml(phase.reward)}</strong></div>`
        : '';

      return `<article class="phase-card ${locked ? 'locked' : ''}">
        <span class="phase-number">FASE ${String(phase.id).padStart(2, '0')}</span>
        <h2>${escapeHtml(phase.title)}</h2>
        <p>${escapeHtml(phase.description)}</p>${action}${reward}</article>`;
    }).join('');
  } catch (error) {
    document.getElementById('phases').innerHTML = `<div class="form-message error">${escapeHtml(error.message)}</div>`;
  }
}

document.getElementById('logout').addEventListener('click', event => {
  event.preventDefault();
  logout();
});

load();
