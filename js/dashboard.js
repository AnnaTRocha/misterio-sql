import { api, escapeHtml, logout, requireSession } from './api-client.js';

async function load() {
  try {
    const user = await requireSession('student');
    if (!user) return;

    document.getElementById('username').textContent = user.username;
    const { phases, progress } = await api('/api/game?action=dashboard');
    const progressByPhase = Object.fromEntries(progress.map(item => [Number(item.phase_id), item]));

    const developed = phases.filter(phase => phase.developed).length;
    const completed = progress.filter(item => item.status === 'completed').length;
    const percent = developed ? Math.round((completed / developed) * 100) : 0;

    document.getElementById('summary').innerHTML = `
      <strong>${String(completed).padStart(2, '0')} / ${String(developed).padStart(2, '0')}</strong>
      <span>arquivos desenvolvidos concluídos // ${percent}% da investigação decodificada</span>
      <div><i style="width:${percent}%"></i></div>`;

    document.getElementById('phases').innerHTML = phases.map(phase => {
      const item = progressByPhase[Number(phase.id)];
      const done = item?.status === 'completed';
      const started = item?.status === 'in_progress';
      const locked = !phase.developed || !phase.released;

      let action = '';
      if (!phase.developed) {
        action = '<span class="phase-state">[ arquivo ainda não recuperado ]</span>';
      } else if (!phase.released) {
        action = '<span class="phase-state">[ bloqueado pelo professor ]</span>';
      } else {
        const label = done ? '✓ REABRIR ARQUIVO' : started ? 'CONTINUAR INVESTIGAÇÃO →' : 'INICIAR INVESTIGAÇÃO →';
        action = `<a class="phase-link" href="phase.html?id=${phase.id}">${label}</a>`;
      }

      const reward = done && phase.reward
        ? `<div class="reward">FRAGMENTO RECUPERADO // <strong>${escapeHtml(phase.reward)}</strong></div>`
        : '';

      return `<article class="case-file ${locked ? 'locked' : ''}" data-index="${String(phase.id).padStart(2, '0')}">
        <span class="phase-number">ARQUIVO_${String(phase.id).padStart(2, '0')} // ${done ? 'DECODIFICADO' : started ? 'ABERTO' : 'NÃO LIDO'}</span>
        <h2>${escapeHtml(phase.title)}</h2>
        <p>${escapeHtml(phase.description)}</p>
        <div class="case-state">${action}${reward}</div>
      </article>`;
    }).join('');
  } catch (error) {
    document.getElementById('phases').innerHTML =
      `<div class="form-message error">FALHA AO INDEXAR ARQUIVOS // ${escapeHtml(error.message)}</div>`;
  }
}

document.getElementById('logout').addEventListener('click', event => {
  event.preventDefault();
  logout();
});

load();
