import { api, escapeHtml, requireSession } from './api-client.js';
import { sqlToExecute } from './sql-selection.js';
import { renderValidationGuide } from './validation-guide.js';
import { confirmInPage } from './confirm-dialog.js';
import { renderQueryResultCell } from './query-result-cell.js';
import { bindSqlHighlight } from './sql-highlight.js';
import { renderSchema } from './schema-view.js';
import { renderHint } from './hint-renderer.js';

const phaseId = Number(new URLSearchParams(location.search).get('id'));
const PHASE_TABLES = {
  1: ['usuarios', 'mensagens', 'arquivos', 'pessoas', 'acessos'],
  2: ['usuarios', 'mensagens', 'arquivos', 'pessoas', 'acessos']
};

function currentTables() {
  return PHASE_TABLES[phaseId] || [];
}

const PHASES = {
  1: {
    code: 'ARQUIVO 3301',
    title: 'O Primeiro Acesso',
    mission: 'Um servidor antigo da UNIBAVE voltou a responder. Explore as tabelas, encontre o usuário desconhecido e descubra o código escondido nas mensagens.',
    story: [
      '00:00:01 // Unidade 3301 reativada após décadas fora da rede.',
      'Uma frase permanece gravada no setor de inicialização: “A verdade não foi apagada. Foi organizada.”',
      'Não existe manual. Você só tem tabelas, consultas e um identificador marcado como desconhecido.'
    ],
    objectives: [
      ['users', '1.1 // Consultar usuarios e localizar o cadastro do usuário desconhecido'],
      ['projection', '1.2 // Exibir apenas id_usuario e nome de usuarios'],
      ['messages', '1.3 // Consultar mensagens cujo remetente_id corresponde ao usuário desconhecido']
    ],
    hints: [
      'A listagem de usuários tem uma entrada fora do padrão.',
      'Compare o identificador dessa entrada com os remetentes das mensagens.',
      'Uma projeção de colunas ajuda a retirar o ruído.',
      'As mensagens do mesmo remetente devem ser lidas em sequência.'
    ],
    initial: 'SELECT * FROM usuarios;'
  },
  2: {
    code: 'INCIDENTE // ECO',
    title: 'O Registro Interrompido',
    mission: 'Reconstrua um acesso irregular. Os relatórios estão fragmentados e a sequência precisa ser confirmada por consultas.',
    story: [
      '17/09/1987 // Um acesso irregular foi registrado durante a madrugada.',
      'Os relatórios foram fragmentados. Há pessoas, entradas, saídas e terminais, mas nenhuma conclusão pronta.',
      'Resolva as seis etapas na ordem que preferir. O banco só entrega o que sua consulta conseguir provar.'
    ],
    objectives: [
      ['witness', '2.1 // Em pessoas, localizar idade de 20 a 30 anos (inclusive) e nome iniciado por A'],
      ['missing', '2.2 // Em acessos, localizar hora_saida sem valor (NULL)'],
      ['cities', '2.3 // Listar pessoas.cidade sem repetição, usando DISTINCT'],
      ['last_access', '2.4 // Ordenar acessos.data_hora da mais recente para a mais antiga (DESC)'],
      ['frequency', '2.5 // Contar acessos por pessoa_id com GROUP BY'],
      ['code', '2.6 // Filtrar acessos.data de 1987-09-17 a 1987-09-21 (inclusive), identificar o usuario_id mais frequente e consultar seu código']
    ],
    hints: [
      '2.1 // A testemunha pertence a uma faixa etária e seu nome começa com uma letra específica.',
      '2.2 // Uma ausência no registro de saída pode ser mais importante que um valor preenchido.',
      '2.3 // Conte cada cidade apenas uma vez.',
      '2.4 // O acesso mais recente muda a direção da investigação.',
      '2.5 // Frequência exige agrupar pessoas antes de comparar totais.',
      '2.6 // Restrinja o período do incidente. A identidade está no cadastro de quem aparece com mais frequência.'
    ],
    initial: 'SELECT * FROM pessoas;'
  }
};

let ready = false;
let hintIndex = 0;
let milestones = new Set();
let querySequence = 0;
let conceptDone = false;
let concept;
let alreadyCompleted = false;
let retakeActive = false;
let isTestUser = false;

const editor = document.getElementById('sqlEditor');
const refreshSqlHighlight = bindSqlHighlight(editor, document.getElementById('sqlHighlight'));
const runBtn = document.getElementById('runBtn');
const resultArea = document.getElementById('resultArea');
const feedback = document.getElementById('queryFeedback');
const history = document.getElementById('queryHistory');

async function init() {
  const user = await requireSession('student');
  if (!user) return;

  const phase = PHASES[phaseId];
  if (!phase) return location.replace('/dashboard.html');

  document.getElementById('username').textContent = user.username;
  isTestUser = Boolean(user.is_test);
  document.body.dataset.theme = phase.theme || 'archive';
  document.title = `${phase.title} | Mistério SQL`;
  document.getElementById('phaseLabel').textContent = `${phase.code} // FASE ${String(phaseId).padStart(2, '0')}`;
  setTitle(phase.title);
  document.getElementById('phaseMission').textContent = phase.mission;
  document.getElementById('terminalName').textContent = `/archive/3301/fase_${String(phaseId).padStart(2, '0')}.sql`;
  document.getElementById('storyLog').innerHTML = phase.story.map(item => `<p>${escapeHtml(item)}</p>`).join('');
  document.getElementById('storyLog').insertAdjacentHTML('beforeend', '<p class="dialect-note">TERMINAL // subconjunto de SQL compatível com PostgreSQL. Use “estrutura” para inspecionar as colunas; PRAGMA é específico do SQLite.</p>');
  setEditorValue(phase.initial);

  renderTables();
  renderHints();
  renderObjectives();
  renderFinish();

  try {
    const start = await api('/api/game?action=start', {
      method: 'POST',
      body: { phase_id: phaseId }
    });
    milestones = new Set(start.milestones || []);
    alreadyCompleted = Boolean(start.already_completed);
    retakeActive = Boolean(start.retake_active);
    conceptDone = Boolean(start.concept_done || (alreadyCompleted && !retakeActive));
    concept = start.concept;
    renderObjectives();
    renderFinish();
  } catch (error) {
    feedback.className = 'query-feedback error';
    feedback.textContent = error.message;
    return setTimeout(() => location.replace('/dashboard.html'), 1200);
  }

  await loadDatabase();
  if (user.is_test) await loadTestTools();
}

function setTitle(text) {
  const element = document.getElementById('phaseTitle');
  element.textContent = text;
  element.dataset.text = text;
}

function renderTables() {
  document.getElementById('tableButtons').innerHTML = currentTables()
    .map(table => `<button class="db-button" type="button" data-table="${table}">${table}</button>`)
    .join('');

  document.querySelectorAll('.db-button').forEach(button => {
    button.addEventListener('click', () => {
      setEditorValue(`SELECT * FROM ${button.dataset.table};`);
      editor.focus();
    });
  });
}

function renderHints() {
  const phase = PHASES[phaseId];
  document.getElementById('hintCounter').textContent = `${hintIndex}/${phase.hints.length}`;
  document.getElementById('hintBtn').disabled = hintIndex >= phase.hints.length;
}

function revealHint() {
  const phase = PHASES[phaseId];
  if (hintIndex >= phase.hints.length) return;
  document.getElementById('hintText').innerHTML = `&gt; ${renderHint(phase.hints[hintIndex++])}`;
  renderHints();
}

function renderObjectives() {
  const phase = PHASES[phaseId];
  const done = phase.objectives.filter(([key]) => milestones.has(key)).length;

  document.getElementById('objectiveCounter').textContent =
    `${String(done).padStart(2, '0')}/${String(phase.objectives.length).padStart(2, '0')}`;

  document.getElementById('objectiveList').innerHTML = phase.objectives.map(([key, label]) => {
    const complete = milestones.has(key);
    return `<div class="objective-item ${complete ? 'done' : ''}">
      <span class="check">${complete ? '✓' : '·'}</span>
      <span>${escapeHtml(label)}</span>
    </div>`;
  }).join('');

  const percent = Math.round((done / phase.objectives.length) * 100);
  document.getElementById('progressText').textContent = `${percent}% DECODIFICADO`;
  document.getElementById('progressBar').style.width = `${percent}%`;
  updateCompletion();
}

function renderFinish() {
  const area = document.getElementById('finishArea');
  const title = phaseId === 1 ? 'ACCESS CODE' : 'CÓDIGO FINAL';

  const descriptions = {
    1: 'Digite o código encontrado nas mensagens do usuário desconhecido.',
    2: 'Quando a etapa 2.6 revelar a identidade, use o código armazenado no cadastro do usuário.'
  };

  area.innerHTML = `
    <span class="dashboard-kicker">PROTOCOLO FINAL</span>
    <h2>${title}</h2>
    <p id="completionHint">${descriptions[phaseId] || ''}</p>
    ${conceptDone ? '<p class="concept-confirmed">✓ CONCEITO VALIDADO</p>' : concept ? `<form id="conceptForm" class="concept-form">
      <fieldset><legend>${escapeHtml(concept.prompt)}</legend>
        <div class="concept-options">${concept.options.map(([value, label]) => `<label class="concept-option"><input type="radio" name="conceptAnswer" value="${escapeHtml(value)}" required><span>${escapeHtml(label)}</span></label>`).join('')}</div>
      </fieldset>
      <button type="submit">Validar conceito</button><p id="conceptFeedback" class="concept-feedback" role="status" aria-live="polite"></p>
    </form>` : ''}
    <form id="codeForm">
      <div class="crt-input-row">
        <input id="accessCodeInput" placeholder="código de acesso" autocomplete="off" required>
        <button id="completeBtn" class="primary-btn" type="submit" disabled>Validar código</button>
      </div>
      <div id="verdict" class="verdict" aria-live="polite"></div>
    </form>
    ${renderRetakeControl()}`;

  document.getElementById('codeForm').addEventListener('submit', complete);
  document.getElementById('retakeBtn')?.addEventListener('click', startRetake);
  document.getElementById('conceptForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const selected = new FormData(event.currentTarget).get('conceptAnswer');
    const feedback = document.getElementById('conceptFeedback');
    try {
      await api('/api/game?action=concept-answer', { method: 'POST', body: { phase_id: phaseId, answer: selected } });
      conceptDone = true;
      renderFinish();
    } catch (error) { feedback.textContent = error.message; }
  });
  updateCompletion();
}

function renderRetakeControl() {
  if (isTestUser || !alreadyCompleted) return '';
  if (retakeActive) {
    return '<p class="concept-confirmed">REFEITURA EM ANDAMENTO // conclusão, nota e liberações anteriores preservadas</p>';
  }
  return '<div class="retake-option"><p>Você pode praticar novamente. A maior nota, a conclusão e as fases liberadas serão mantidas.</p><button id="retakeBtn" class="primary-btn" type="button">Refazer atividade</button><p id="retakeFeedback" class="retake-feedback" role="alert" aria-live="assertive"></p></div>';
}

async function startRetake(event) {
  const button = event.currentTarget;
  if (!await confirmInPage({
    title: 'Refazer atividade',
    message: 'As consultas e respostas de prática desta fase serão apagadas. A maior nota, a conclusão e as fases liberadas serão mantidas.',
    confirmLabel: 'Apagar e refazer'
  })) return;
  button.disabled = true;
  try {
    await api('/api/game?action=retake-activity', {
      method: 'POST',
      body: { phase_id: phaseId }
    });
    location.reload();
  } catch (error) {
    button.disabled = false;
    document.getElementById('retakeFeedback').textContent = error.message;
  }
}

function updateCompletion() {
  const button = document.getElementById('completeBtn');
  if (!button) return;

  const required = PHASES[phaseId].objectives.map(([key]) => key);
  const ready = required.every(key => milestones.has(key));
  button.disabled = !ready || !conceptDone;

  const hint = document.getElementById('completionHint');
  if (!hint) return;

  if (ready) {
    const messages = {
      1: 'A trilha do usuário desconhecido está completa. Informe o código encontrado nas mensagens.',
      2: 'As seis etapas foram reconstruídas. Informe o código associado à identidade que você identificou.'
    };
    hint.textContent = messages[phaseId] || '';
  }
}

async function loadDatabase() {
  ready = true;
  runBtn.disabled = false;
  feedback.className = 'query-feedback ok';
  feedback.textContent = 'CONEXÃO ESTABELECIDA // arquivo 3301 montado';
}

function isReadOnly(sql) {
  const cleaned = sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();

  return /^(SELECT|WITH)/i.test(cleaned) &&
    !/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|ATTACH|DETACH|VACUUM)\b/i.test(cleaned);
}

async function executeSql() {
  if (!ready) return;

  const query = sqlToExecute(editor);
  if (!query) return renderError('Nenhum comando recebido.');
  if (!isReadOnly(query)) {
    return renderError('Acesso negado: somente consultas de leitura SELECT/WITH são permitidas.');
  }

  runBtn.disabled = true;
  feedback.className = 'query-feedback';
  feedback.textContent = 'EXECUTANDO // lendo setores do arquivo...';

  try {
    const log = await api('/api/game?action=query', {
      method: 'POST',
      body: { phase_id: phaseId, query }
    });
    const resultSets = log.result || [];

    milestones = new Set(log.milestones || []);
    renderObjectives();
    renderResults(resultSets);
    addHistory(query, true);

    const rows = resultSets.reduce((count, set) => count + set.values.length, 0);
    feedback.className = 'query-feedback ok';
    feedback.textContent = `OK // ${rows} linha(s) retornada(s) // investigação atualizada`;
  } catch (error) {
    addHistory(query, false);
    renderError(`Erro SQL: ${error.message}`);
    feedback.className = 'query-feedback error';
    feedback.textContent = 'ERRO // comando rejeitado';
  } finally {
    runBtn.disabled = !ready;
  }
}

function renderResults(resultSets) {
  if (!resultSets.length) {
    resultArea.innerHTML = '<div class="empty-result"><span>∅</span><p>Nenhum registro encontrado. O vazio também é uma evidência.</p></div>';
    return;
  }

  resultArea.innerHTML = resultSets.map(set => `
    <div class="query-meta">${set.values.length} linha(s)</div>
    <table class="result-table">
      <thead><tr>${set.columns.map(column => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead>
      <tbody>${set.values.slice(0, 200).map(row =>
        `<tr>${row.map(value => `<td>${renderQueryResultCell(value, { linkExternal: true })}</td>`).join('')}</tr>`
      ).join('')}</tbody>
    </table>`).join('');
}

function addHistory(query, ok) {
  const line = document.createElement('div');
  line.className = 'history-line';
  line.innerHTML = `
    <span>#${String(++querySequence).padStart(2, '0')}</span>
    <code>${escapeHtml(query.replace(/\s+/g, ' '))}</code>
    <span class="${ok ? 'history-ok' : 'history-error'}">${ok ? 'OK' : 'ERRO'}</span>`;
  history.prepend(line);
}

function renderError(message) {
  resultArea.innerHTML = `<div class="sql-error">${escapeHtml(message)}</div>`;
}

async function complete(event) {
  event.preventDefault();
  let verdict = document.getElementById('verdict');
  let button = document.getElementById('completeBtn');

  try {
    button.disabled = true;
    const data = await api('/api/game?action=complete', {
      method: 'POST',
      body: {
        phase_id: phaseId,
        answer: document.getElementById('accessCodeInput').value
      }
    });

    alreadyCompleted = true;
    retakeActive = false;
    renderFinish();
    verdict = document.getElementById('verdict');
    verdict.className = 'verdict success';
    verdict.textContent = phaseId === 1
      ? `✓ ACCESS GRANTED // código ${data.reward} confirmado // Fase 02 pronta para liberação`
      : `✓ ARQUIVO 3301 DECODIFICADO // código ${data.reward} confirmado`;
  } catch (error) {
    verdict.className = 'verdict failure';
    verdict.textContent = `✕ ${error.message}`;
    button.disabled = false;
  }
}

async function showStructure() {
  const match = editor.value.match(/\b(?:FROM|JOIN|TABLE)\s+([a-z_][a-z0-9_]*)/i);
  const tables = currentTables();
  const table = match?.[1] && tables.includes(match[1].toLowerCase())
    ? match[1].toLowerCase()
    : tables[0];
  const button = document.getElementById('schemaBtn');
  button.disabled = true;
  feedback.className = 'query-feedback';
  feedback.textContent = `CONSULTANDO ESTRUTURA // ${table}`;
  try {
    const data = await api('/api/game?action=schema', { method: 'POST', body: { phase_id: phaseId, table } });
    resultArea.innerHTML = renderSchema(table, data.columns);
    feedback.className = 'query-feedback ok';
    feedback.textContent = `ESTRUTURA // ${table} // ${data.columns.length} coluna(s)`;
  } catch (error) {
    renderError(error.message);
    feedback.className = 'query-feedback error';
    feedback.textContent = 'ERRO // estrutura indisponível';
  } finally {
    button.disabled = false;
  }
}

function setEditorValue(value) {
  editor.value = value;
  refreshSqlHighlight();
}

async function loadTestTools() {
  const root = document.getElementById('testTools');
  if (!root) return;

  try {
    const data = await api(`/api/game?action=test-tools&phase_id=${phaseId}`);
    root.hidden = false;
    root.innerHTML = `${renderValidationGuide(data, 'resetTestActivity')}<p id="testResetFeedback" class="retake-feedback" role="alert" aria-live="assertive"></p>`;

    document.getElementById('resetTestActivity').addEventListener('click', async event => {
      if (!await confirmInPage({
        title: 'Refazer atividade de teste',
        message: 'Os checklists, as consultas e as respostas desta fase serão apagados para este usuário de teste.',
        confirmLabel: 'Apagar e refazer'
      })) return;

      const button = event.currentTarget;
      button.disabled = true;
      const originalLabel = button.textContent;
      button.textContent = 'Zerando atividade...';

      try {
        await api('/api/game?action=reset-test-activity', {
          method: 'POST',
          body: { phase_id: phaseId }
        });
        location.reload();
      } catch (error) {
        button.disabled = false;
        button.textContent = originalLabel;
        document.getElementById('testResetFeedback').textContent = error.message;
      }
    });
  } catch (error) {
    root.hidden = false;
    root.innerHTML = `<div class="sql-error">FALHA // ${escapeHtml(error.message)}</div>`;
  }
}

document.getElementById('hintBtn').addEventListener('click', revealHint);
document.getElementById('schemaBtn').addEventListener('click', showStructure);
document.getElementById('clearBtn').addEventListener('click', () => {
  setEditorValue('');
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
    setEditorValue(`${editor.value.slice(0, start)}  ${editor.value.slice(end)}`);
    editor.selectionStart = editor.selectionEnd = start + 2;
  }
});

init();
