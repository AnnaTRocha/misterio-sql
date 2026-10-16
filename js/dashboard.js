import { api, escapeHtml, logout, requireSession } from './api-client.js';

const PHASE_META = {
  1: { arc: 'ARQUIVO // 3301', theme: 'archive' },
  2: { arc: 'ARQUIVO // 3301', theme: 'archive' },
  3: { arc: 'OBSERVATÓRIO // 1987', theme: 'blueprint' },
  4: { arc: 'OBSERVATÓRIO // 1987', theme: 'catalog' },
  5: { arc: 'OBSERVATÓRIO // 1987', theme: 'transaction' },
  6: { arc: 'INTERCEPTAÇÃO // NÓ', theme: 'scanner' },
  7: { arc: 'INTERCEPTAÇÃO // NÓ', theme: 'relations' },
  8: { arc: 'INTERCEPTAÇÃO // NÓ', theme: 'analysis' },
  9: { arc: 'OPERAÇÃO // FINAL', theme: 'nosql' }
};

const formatScore = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(Number(value || 0));

async function load() {
  try {
    const user = await requireSession('student');
    if (!user) return;

    document.getElementById('username').textContent = user.username;
    const { phases, progress, identity, assessment } = await api('/api/game?action=dashboard');
    const progressByPhase = Object.fromEntries(progress.map(item => [Number(item.phase_id), item]));

    const completed = new Set(progress.filter(item => item.status === 'completed').map(item => Number(item.phase_id))).size;
    const percent = phases.length ? Math.round((completed / phases.length) * 100) : 0;

    const identityText = identity
      ? `${escapeHtml(identity.alias)} // ${escapeHtml(user.is_test ? 'USUÁRIO TESTE' : (identity.group_code || 'SEM GRUPO'))}`
      : 'IDENTIDADE PENDENTE';
    const score = Number(assessment?.score || 0);
    const assessmentGroups = assessment?.assessments || [];
    const assessmentRows = assessmentGroups.map(group => `
      <li class="assessment-row">
        <span><strong>${escapeHtml(group.title)}</strong><small>Fases ${String(group.phase_start).padStart(2, '0')}–${String(group.phase_end).padStart(2, '0')}</small></span>
        <b>${formatScore(group.score)} / ${formatScore(group.weight)} pts</b>
      </li>`).join('');

    document.getElementById('summary').innerHTML = `
      <strong>${String(completed).padStart(2, '0')} / ${String(phases.length).padStart(2, '0')}</strong>
      <span>atividades concluídas // ${percent}% da investigação decodificada</span>
      <span class="arg-identity">${identityText} // PONTUAÇÃO AVALIATIVA ${formatScore(score)}%</span>
      <div><i style="width:${percent}%"></i></div>
      <section class="assessment-breakdown" aria-label="Pontuação nos cinco exercícios">
        <h2>Pontuação por exercício</h2>
        <ul>${assessmentRows}</ul>
      </section>`;

    document.getElementById('phases').innerHTML = phases.map(phase => {
      const meta = PHASE_META[Number(phase.id)] || PHASE_META[1];
      const item = progressByPhase[Number(phase.id)];
      const done = item?.status === 'completed';
      const started = item?.status === 'in_progress';
      const finalGate = !user.is_test && Number(phase.id) === 9 && !assessment?.final_eligible;
      const protocolGate = !user.is_test && Number(phase.id) === 9 && assessment?.final_eligible && !assessment?.final_protocol_unlocked;
      const previousGate = !user.is_test && Number(phase.id) >= 3 && progressByPhase[Number(phase.id) - 1]?.status !== 'completed';
      const exercise = assessmentGroups.find(group => Number(phase.id) >= group.phase_start && Number(phase.id) <= group.phase_end);
      const locked = !phase.developed || (!user.is_test && !phase.released) || finalGate || protocolGate || previousGate;

      let action = '';
      if (!phase.developed) {
        action = '<span class="phase-state">[ arquivo ainda não recuperado ]</span>';
      } else if (finalGate) {
        action = '<span class="phase-state">[ exige 60% acumulados ]</span>';
      } else if (previousGate) {
        action = '<span class="phase-state">[ conclua o arquivo anterior ]</span>';
      } else if (protocolGate) {
        action = `<form class="final-protocol" data-final-protocol>
          <input name="protocol" inputmode="numeric" maxlength="4" placeholder="PROTOCOLO" required>
          <button type="submit">VALIDAR</button>
        </form>`;
      } else if (!user.is_test && !phase.released) {
        action = '<span class="phase-state">[ bloqueado pelo professor ]</span>';
      } else {
        const label = done ? '✓ REABRIR ARQUIVO' : started ? 'CONTINUAR INVESTIGAÇÃO →' : 'INICIAR INVESTIGAÇÃO →';
        action = `<a class="phase-link" href="phase.html?id=${phase.id}">${label}</a>`;
      }

      return `<article class="case-file theme-${meta.theme} ${locked ? 'locked' : ''}" data-index="${String(phase.id).padStart(2, '0')}">
        <span class="phase-arc">${escapeHtml(meta.arc)} // ${escapeHtml(exercise?.title || 'EXERCÍCIO')} · ${formatScore(exercise?.weight)}% // FASE ${String(phase.id).padStart(2, '0')}</span>
        <span class="phase-number">ARQUIVO_${String(phase.id).padStart(2, '0')} // ${done ? 'DECODIFICADO' : started ? 'ABERTO' : 'NÃO LIDO'}</span>
        <h2>${escapeHtml(phase.title)}</h2>
        <p>${escapeHtml(phase.description)}</p>
        <div class="case-state">${action}</div>
      </article>`;
    }).join('');

    document.querySelectorAll('[data-final-protocol]').forEach(form => {
      form.addEventListener('submit', async event => {
        event.preventDefault();
        const protocol = new FormData(form).get('protocol');
        try {
          await api('/api/game?action=unlock-final', {
            method: 'POST',
            body: { protocol }
          });
          await load();
        } catch (error) {
          alert(error.message);
        }
      });
    });
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
