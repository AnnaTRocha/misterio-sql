import { api, escapeHtml, requireSession } from './api-client.js';

const phaseId = Number(new URLSearchParams(location.search).get('id'));
const PHASES = {
  1: {
    title: 'O notebook desaparecido',
    mission: 'Identifique quem levou o notebook do Laboratório 2 usando as evidências disponíveis.',
    clues: [
      'Encontre a ocorrência do dia 18/08/2026.',
      'Leia a descrição e descubra onde e quando procurar.',
      'Descubra quais pessoas aparecem nos registros de acesso.',
      'Procure depoimentos que tragam características úteis.',
      'Cruze as informações até restar apenas uma possibilidade.'
    ]
  },
  2: {
    title: 'Filtrando evidências',
    mission: 'Use WHERE e combine filtros SQL para reduzir os registros. A fase só é concluída após uma consulta de filtro válida.',
    clues: [
      'Escolha uma tabela com vários registros.',
      'Use WHERE para restringir o resultado.',
      'Combine com AND, OR, LIKE, IN ou BETWEEN.',
      'ORDER BY também pode ajudar a organizar as evidências.'
    ]
  },
  3: {
    title: 'Conectando as evidências',
    mission: 'Relacione informações de tabelas diferentes usando JOIN e ON.',
    clues: [
      'As tabelas usam pessoa_id para apontar para pessoas.id.',
      'Escolha duas tabelas relacionadas.',
      'Use JOIN ... ON para cruzar os registros.',
      'Você pode encadear mais de um JOIN para aprofundar a investigação.'
    ]
  }
};

let db;
let lastQualifies = false;
const editor = document.getElementById('sqlEditor');
const runBtn = document.getElementById('runBtn');
const resultArea = document.getElementById('resultArea');
const dbStatus = document.getElementById('dbStatus');

async function init() {
  const user = await requireSession('student');
  if (!user) return;
  document.getElementById('username').textContent = user.username;

  if (!PHASES[phaseId]) return location.replace('/dashboard.html');
  const phase = PHASES[phaseId];
  document.title = `${phase.title} — Mistério SQL`;
  document.getElementById('phaseLabel').textContent = `FASE ${phaseId}`;
  document.getElementById('phaseTitle').textContent = phase.title;
  document.getElementById('phaseMission').textContent = phase.mission;
  document.getElementById('terminalName').textContent = `fase_${phaseId}.sql`;
  document.getElementById('clueCounter').textContent = `01—${String(phase.clues.length).padStart(2, '0')}`;
  document.getElementById('clueList').innerHTML = phase.clues.map((clue, index) =>
    `<li><span>${String(index + 1).padStart(2, '0')}</span><p>${escapeHtml(clue)}</p></li>`
  ).join('');

  try {
    await api('/api/game?action=start', { method: 'POST', body: { phase_id: phaseId } });
  } catch (error) {
    alert(error.message);
    return location.replace('/dashboard.html');
  }

  renderFinish();
  await loadDatabase();
}

function renderFinish() {
  const area = document.getElementById('finishArea');
  if (phaseId === 1) {
    area.innerHTML = `
      <h2>Tem um suspeito?</h2>
      <p>Digite o nome completo da pessoa que, segundo as evidências, levou o notebook.</p>
      <form id="accusationForm">
        <div class="input-row"><input id="suspectInput" placeholder="Nome completo" required><button>Enviar acusação</button></div>
        <div id="verdict" class="verdict" aria-live="polite"></div>
      </form>`;
    document.getElementById('accusationForm').addEventListener('submit', accuse);
  } else {
    area.innerHTML = `
      <h2>Encontrou a evidência?</h2>
      <p id="completionHint">Execute uma consulta que atenda ao objetivo da fase.</p>
      <button id="completeBtn" class="primary-btn" disabled>Concluir fase</button>
      <div id="verdict" class="verdict" aria-live="polite"></div>`;
    document.getElementById('completeBtn').addEventListener('click', complete);
  }
}

async function loadDatabase() {
  try {
    if (typeof initSqlJs !== 'function') throw new Error('A biblioteca SQL não foi carregada.');
    const SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
    });
    const response = await fetch('data/caso.sqlite', { cache: 'no-store' });
    if (!response.ok) throw new Error('Não foi possível carregar o banco do desafio.');
    db = new SQL.Database(new Uint8Array(await response.arrayBuffer()));
    dbStatus.className = 'db-status ready';
    dbStatus.innerHTML = '<span></span>Banco conectado';
    runBtn.disabled = false;
  } catch (error) {
    dbStatus.className = 'db-status error';
    dbStatus.innerHTML = '<span></span>Falha ao carregar';
    renderError(error.message);
  }
}

function isReadOnly(sql) {
  const cleaned = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  return /^(SELECT|WITH|PRAGMA\s+table_info)/i.test(cleaned) &&
    !/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|ATTACH|DETACH|VACUUM)\b/i.test(cleaned);
}

async function executeSql() {
  if (!db) return;
  const query = editor.value.trim();
  if (!query) return renderError('Digite uma consulta SQL.');
  if (!isReadOnly(query)) return renderError('São permitidas apenas consultas de leitura (SELECT/WITH).');

  try {
    const resultSets = db.exec(query);
    const log = await api('/api/game?action=query', {
      method: 'POST',
      body: { phase_id: phaseId, query, executed: true }
    });
    lastQualifies = Boolean(log.qualifies);
    updateCompletionState();

    if (!resultSets.length) {
      resultArea.innerHTML = '<div class="empty-result"><span>∅</span><p>Nenhum registro encontrado.</p></div>';
      return;
    }

    resultArea.innerHTML = resultSets.map(set => {
      const rows = set.values.slice(0, 200);
      return `<div class="query-meta">${set.values.length} linha(s)</div>
        <table class="result-table"><thead><tr>${set.columns.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(row => `<tr>${row.map(v => `<td>${escapeHtml(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }).join('');
  } catch (error) {
    try {
      await api('/api/game?action=query', {
        method: 'POST',
        body: { phase_id: phaseId, query, executed: false }
      });
    } catch { /* a falha principal continua sendo o SQL */ }
    lastQualifies = false;
    updateCompletionState();
    renderError(`Erro SQL: ${error.message}`);
  }
}

function updateCompletionState() {
  if (phaseId === 1) return;
  const button = document.getElementById('completeBtn');
  button.disabled = !lastQualifies;
  document.getElementById('completionHint').textContent = lastQualifies
    ? 'Consulta válida para o objetivo. Você pode concluir a fase.'
    : 'Continue investigando: sua última consulta ainda não atende ao objetivo da fase.';
}

async function complete() {
  if (!lastQualifies) return;
  const verdict = document.getElementById('verdict');
  try {
    const data = await api('/api/game?action=complete', { method: 'POST', body: { phase_id: phaseId } });
    verdict.className = 'verdict success';
    verdict.textContent = `✓ Fase concluída. Evidência encontrada: ${data.reward}`;
    document.getElementById('completeBtn').disabled = true;
  } catch (error) {
    verdict.className = 'verdict failure';
    verdict.textContent = error.message;
  }
}

async function accuse(event) {
  event.preventDefault();
  const verdict = document.getElementById('verdict');
  try {
    const data = await api('/api/game?action=complete', {
      method: 'POST',
      body: { phase_id: 1, answer: document.getElementById('suspectInput').value }
    });
    verdict.className = 'verdict success';
    verdict.textContent = `✓ Caso solucionado. Evidência encontrada: ${data.reward}`;
  } catch (error) {
    verdict.className = 'verdict failure';
    verdict.textContent = '✕ As evidências ainda não sustentam essa acusação. Continue investigando.';
  }
}

function renderError(message) {
  resultArea.innerHTML = `<div class="sql-error">${escapeHtml(message)}</div>`;
}

document.getElementById('clearBtn').addEventListener('click', () => {
  editor.value = '';
  editor.focus();
});
runBtn.addEventListener('click', executeSql);
editor.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    executeSql();
  }
  if (event.key === 'Tab') {
    event.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value = `${editor.value.slice(0, start)}  ${editor.value.slice(end)}`;
    editor.selectionStart = editor.selectionEnd = start + 2;
  }
});

init();
