import { api, escapeHtml, logout, requireSession } from './api-client.js';
import { animateRecentUnlock } from './unlock-animation.js';

const PHASE_META = {
  1: { theme: 'archive' },
  2: { theme: 'archive' },
  3: { theme: 'blueprint' },
  4: { theme: 'catalog' },
  5: { theme: 'transaction' },
  6: { theme: 'scanner' },
  7: { theme: 'relations' },
  8: { theme: 'analysis' },
  9: { theme: 'nosql' }
};

const formatScore = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(Number(value || 0));

async function startBootSequence() {
  const dialog = document.getElementById('bootSequence');
  let shouldRun = false;
  try {
    shouldRun = sessionStorage.getItem('misterio-sql:boot-sequence') === '1';
    sessionStorage.removeItem('misterio-sql:boot-sequence');
  } catch {
    return;
  }
  if (!shouldRun || !dialog?.showModal) return;

  const output = document.getElementById('bootOutput');
  const status = document.getElementById('bootStatus');
  const progress = document.getElementById('bootProgressBar');
  const skip = document.getElementById('bootSkip');
  const lines = [
    'BOOT ROM // ARQUIVO 3301',
    'verificando sessão ........ OK',
    'indexando arquivos ........ 09',
    'terminal de investigação . ONLINE'
  ];
  let active = true;
  const pause = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));
  const close = () => {
    active = false;
    if (dialog.open) dialog.close();
  };
  skip.addEventListener('click', close, { once: true });
  dialog.addEventListener('cancel', () => { active = false; }, { once: true });
  dialog.addEventListener('close', () => { active = false; }, { once: true });
  dialog.showModal();
  skip.focus();

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    output.textContent = lines.join('\n');
    progress.style.width = '100%';
    await pause(180);
  } else {
    for (const [lineIndex, line] of lines.entries()) {
      if (!active) break;
      const row = document.createElement('span');
      output.append(row);
      for (const character of line) {
        if (!active) break;
        row.textContent += character;
        await pause(13);
      }
      if (lineIndex < lines.length - 1) output.append(document.createTextNode('\n'));
      progress.style.width = `${Math.round(((lineIndex + 1) / lines.length) * 100)}%`;
      await pause(90);
    }
  }

  if (active) {
    status.textContent = 'Terminal pronto.';
    await pause(100);
    close();
  }
}

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
      ? `${escapeHtml(identity.alias)} · ${escapeHtml(user.is_test ? 'USUÁRIO TESTE' : (identity.group_code || 'SEM GRUPO'))}`
      : 'IDENTIDADE PENDENTE';
    const score = Number(assessment?.score || 0);
    document.getElementById('summary').innerHTML = `
      <strong>${String(completed).padStart(2, '0')} / ${String(phases.length).padStart(2, '0')}</strong>
      <span>fases concluídas</span>
      <span class="arg-identity">${identityText} · pontuação ${formatScore(score)}%</span>
      <div><i style="width:${percent}%"></i></div>`;

    document.getElementById('phases').innerHTML = phases.map(phase => {
      const meta = PHASE_META[Number(phase.id)] || PHASE_META[1];
      const item = progressByPhase[Number(phase.id)];
      const done = item?.status === 'completed';
      const started = item?.status === 'in_progress';
      const finalGate = !user.is_test && Number(phase.id) === 9 && !assessment?.final_eligible;
      const protocolGate = !user.is_test && Number(phase.id) === 9 && assessment?.final_eligible && !assessment?.final_protocol_unlocked;
      const previousGate = !user.is_test && Number(phase.id) >= 3 && progressByPhase[Number(phase.id) - 1]?.status !== 'completed';
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
        <span class="phase-number">ARQUIVO ${String(phase.id).padStart(2, '0')} · ${done ? 'DECODIFICADO' : started ? 'ABERTO' : 'NÃO LIDO'}</span>
        <h2>Fase ${String(phase.id).padStart(2, '0')} · ${escapeHtml(phase.title)}</h2>
        <p>${escapeHtml(phase.description)}</p>
        <div class="case-state">${action}</div>
      </article>`;
    }).join('');
    animateRecentUnlock(user.username);

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
      `<div class="form-message error">Falha ao carregar os arquivos: ${escapeHtml(error.message)}</div>`;
  }
}

document.getElementById('logout').addEventListener('click', event => {
  event.preventDefault();
  logout();
});

startBootSequence();
load();
