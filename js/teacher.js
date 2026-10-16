import { api, escapeHtml, logout, requireSession } from './api-client.js';

let phaseCount = 0;
const formatScore = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(Number(value || 0));

const ASSESSMENTS = [
  { title: 'Exercício 01', start: 1, end: 2, weight: 15 },
  { title: 'Exercício 02', start: 3, end: 4, weight: 15 },
  { title: 'Exercício 03', start: 5, end: 6, weight: 15 },
  { title: 'Exercício 04', start: 7, end: 8, weight: 15 },
  { title: 'Exercício 05', start: 9, end: 9, weight: 40 }
];

async function load() {
  try {
    const user = await requireSession('teacher');
    if (!user) return;
    document.getElementById('username').textContent = user.username;
    const data = await api('/api/teacher?action=overview');
    phaseCount = data.phases.length;
    renderPhases(data.phases);
    renderAssessments();
    renderActivityPlanVisibility(data.activity_plan_public);
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
      <strong>Fase ${String(phase.id).padStart(2, '0')} · ${escapeHtml(phase.title)}</strong>
      <span>${phase.started} começaram · ${phase.completed} concluíram esta fase</span>
      ${phase.developed
        ? `<label class="switch-row"><input type="checkbox" data-release="${phase.id}" ${phase.released ? 'checked' : ''}> Fase liberada</label>`
        : '<em>Ainda não desenvolvida</em>'}
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

function renderAssessments() {
  const root = document.getElementById('assessmentAdmin');
  root.innerHTML = ASSESSMENTS.map(assessment => {
    const firstPhase = String(assessment.start).padStart(2, '0');
    const lastPhase = String(assessment.end).padStart(2, '0');
    const phaseLabel = assessment.start === assessment.end
      ? `Fase ${firstPhase}`
      : `Fases ${firstPhase} e ${lastPhase}`;
    const scoreLabel = assessment.start === assessment.end
      ? `${assessment.weight} pontos ao concluir a fase`
      : `${formatScore(assessment.weight / 2)} pontos por fase concluída`;

    return `
      <article class="admin-card">
        <strong>${escapeHtml(assessment.title)} · ${assessment.weight} pontos</strong>
        <span>Avalia ${phaseLabel}</span>
        <span>${scoreLabel}</span>
      </article>`;
  }).join('');
}

function renderActivityPlanVisibility(isPublic) {
  const input = document.getElementById('activityPlanPublic');
  const status = document.getElementById('activityPlanStatus');
  input.checked = isPublic === true;
  input.disabled = false;
  status.textContent = input.checked
    ? 'Plano publicado: qualquer pessoa com o link pode visualizar.'
    : 'Plano oculto: o conteúdo não é exibido na página pública.';

  input.onchange = async () => {
    const requestedVisibility = input.checked;
    input.disabled = true;
    status.textContent = requestedVisibility ? 'Publicando plano...' : 'Ocultando plano...';
    try {
      await api('/api/teacher?action=activity-plan-visibility', {
        method: 'POST',
        body: { is_public: requestedVisibility }
      });
      status.textContent = requestedVisibility
        ? 'Plano publicado: qualquer pessoa com o link pode visualizar.'
        : 'Plano oculto: o conteúdo não é exibido na página pública.';
    } catch (error) {
      input.checked = !requestedVisibility;
      status.textContent = 'Não foi possível salvar a configuração.';
      alert(error.message);
    } finally {
      input.disabled = false;
    }
  };
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
        <label class="sr-only" for="reset-password-${reset.user_id}">Senha temporária para ${escapeHtml(reset.username)}</label>
        <input id="reset-password-${reset.user_id}" type="password" minlength="6" required autocomplete="new-password" placeholder="Senha temporária" data-password-for="${reset.user_id}">
        <button type="button" data-reset="${reset.user_id}">Redefinir</button>
      </div>
    </article>`).join('');

  root.querySelectorAll('[data-reset]').forEach(button => button.addEventListener('click', async () => {
    const userId = Number(button.dataset.reset);
    const input = root.querySelector(`[data-password-for="${userId}"]`);
    if (!input.reportValidity()) return;
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
    root.innerHTML = '<tr><td colspan="10">Nenhum estudante cadastrado.</td></tr>';
    return;
  }
  root.innerHTML = students.map(student => `
    <tr class="${student.is_test ? 'test-student' : ''}">
      <td>${escapeHtml(student.username)}</td>
      <td>${escapeHtml(student.investigator_alias || 'Não informado')}</td>
      <td>${student.is_test ? '<span class="test-badge">SEM GRUPO</span>' : escapeHtml(student.group_code || 'Não informado')}</td>
      <td>${student.completed} / ${phaseCount}</td>
      <td>${student.current_phase ? `Fase ${String(student.current_phase).padStart(2, '0')}` : 'Curso concluído'}</td>
      <td>${formatScore(student.score)}%</td>
      <td>${student.queries}</td>
      <td>${student.attempts}</td>
      <td>${student.last_login_at ? formatDate(student.last_login_at) : 'Sem acesso'}</td>
      <td>
        <label class="switch-row test-user-toggle">
          <input type="checkbox" data-test-user="${student.id}" ${student.is_test ? 'checked' : ''}>
          <span>${student.is_test ? 'Teste' : 'Aluno'}</span>
        </label>
      </td>
    </tr>`).join('');

  root.querySelectorAll('[data-test-user]').forEach(input => input.addEventListener('change', async () => {
    input.disabled = true;
    try {
      await api('/api/teacher?action=set-test-user', {
        method: 'POST',
        body: { user_id: Number(input.dataset.testUser), is_test: input.checked }
      });
      await load();
    } catch (error) {
      input.checked = !input.checked;
      input.disabled = false;
      alert(error.message);
    }
  }));
}

function formatDate(value) {
  if (!value) return 'Não informado';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

document.getElementById('reorganizeGroups').addEventListener('click', async event => {
  if (!window.confirm('Reorganizar os estudantes ativos nos grupos agora? Isso pode alterar a equipe atribuída a cada estudante.')) return;
  const button = event.currentTarget;
  const original = button.textContent;
  button.disabled = true;
  button.textContent = 'Reorganizando...';
  try {
    const result = await api('/api/teacher?action=reorganize-groups', { method: 'POST', body: {} });
    const distribution = result.distribution || {};
    await load();
    alert(`Grupos reorganizados: Grupo 01 = ${distribution.group_1 ?? 0}, Grupo 02 = ${distribution.group_2 ?? 0}. Usuários teste fora dos grupos: ${distribution.test_users ?? 0}.`);
  } catch (error) {
    alert(error.message);
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
});

document.getElementById('logout').addEventListener('click', event => {
  event.preventDefault();
  logout();
});

load();
