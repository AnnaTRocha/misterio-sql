import { api, escapeHtml, requireSession } from './api-client.js';
import { sqlToExecute } from './sql-selection.js';
import { renderValidationGuide } from './validation-guide.js';
import { confirmInPage } from './confirm-dialog.js';
import { renderQueryResultCell } from './query-result-cell.js';
import { bindSqlHighlight } from './sql-highlight.js';
import { renderSchema } from './schema-view.js';
import { renderHint } from './hint-renderer.js';

const phaseId = Number(new URLSearchParams(location.search).get('id'));
const $ = id => document.getElementById(id);
const refreshSqlHighlight = bindSqlHighlight($('sqlEditor'), $('sqlHighlight'));
let ready = false;
let lesson;
let milestones = new Set();
let hintIndex = 0;
let concept;
let conceptDone = false;
let alreadyCompleted = false;
let retakeActive = false;
let isTestUser = false;

function renderTableButtons(tables) {
  $('tableButtons').innerHTML = tables.map(name => `<button class="db-button" data-table="${escapeHtml(name)}" type="button">${escapeHtml(name)}</button>`).join('');
  $('tableButtons').querySelectorAll('[data-table]').forEach(button => button.addEventListener('click', () => {
    setEditorValue(`SELECT * FROM ${button.dataset.table};`);
  }));
}

function setEditorValue(value) {
  $('sqlEditor').value = value;
  refreshSqlHighlight();
}

function renderObjectiveRequirements(requirements) {
  if (!requirements) return '';
  const rows = requirements.rows.map(row => `<tr>${row.map(value => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('');
  const headers = (requirements.headers || ['Parte', 'Critério']).map(value => `<th>${escapeHtml(value)}</th>`).join('');
  return `<details class="objective-spec"><summary>${escapeHtml(requirements.title)}</summary><p>${escapeHtml(requirements.intro)}</p><div class="objective-spec-scroll"><table class="result-table objective-spec-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div><p class="objective-spec-expected">${escapeHtml(requirements.expected)}</p></details>`;
}

async function init() {
  const user = await requireSession('student');
  if (!user) return;
  $('username').textContent = user.username;
  isTestUser = Boolean(user.is_test);
  try {
    const start = await api('/api/game?action=start', { method: 'POST', body: { phase_id: phaseId } });
    lesson = start.lesson;
    milestones = new Set(start.milestones);
    concept = start.concept;
    alreadyCompleted = Boolean(start.already_completed);
    retakeActive = Boolean(start.retake_active);
    conceptDone = Boolean(start.concept_done || (alreadyCompleted && !retakeActive));
    document.body.dataset.theme = lesson.theme;
    document.querySelector('.brand span:last-child').textContent = lesson.code;
    document.title = `${lesson.title} | Mistério SQL`;
    $('phaseLabel').textContent = `${lesson.code} // FASE ${String(phaseId).padStart(2, '0')}`;
    $('phaseTitle').textContent = lesson.title;
    $('phaseTitle').dataset.text = lesson.title;
    $('phaseMission').textContent = lesson.mission;
    $('terminalName').textContent = `/archive/3301/fase_${String(phaseId).padStart(2, '0')}.sql`;
    const scopeText = phaseId === 3
      ? 'Execute uma consulta por vez para relacionar as pistas.'
      : phaseId === 4
        ? 'Os dados de origem já estão carregados. As tabelas de destino ainda não existem: você vai criá-las e migrar os dados. Sua cópia é individual: suas alterações não afetam os demais estudantes.'
        : 'Execute uma instrução por vez. Alterações acontecem apenas na sua cópia de investigação.';
    $('storyLog').innerHTML = `<p>${escapeHtml(lesson.mission)}</p><p>${scopeText}</p><p class="dialect-note">TERMINAL // subconjunto de SQL compatível com PostgreSQL. Use “estrutura” para inspecionar as colunas; PRAGMA é específico do SQLite.</p>${phaseId === 4 ? renderWarmup(lesson.warmup) : ''}`;
    $('objectiveRequirements').innerHTML = renderObjectiveRequirements(lesson.requirements);
    setEditorValue(lesson.initial);
    renderTableButtons(lesson.tables);
    render();
    ready = true;
    $('runBtn').disabled = false;
    if (phaseId === 4 && start.initial_preview?.length) {
      $('resultArea').innerHTML = readOnlyPreview(start.initial_preview, lesson.initial);
      $('queryFeedback').textContent = 'PRÉVIA DA ORIGEM // os dados iniciais estão carregados na sua cópia isolada';
    } else {
      $('queryFeedback').textContent = 'CONEXÃO ESTABELECIDA // cópia isolada carregada';
    }
    if (user.is_test) await loadTestTools();
  } catch (error) {
    $('queryFeedback').textContent = `FALHA // ${error.message}`;
  }
}

function renderWarmup(warmup) {
  if (!warmup) return '';
  const headings = warmup.columns.map(value => `<th>${escapeHtml(value)}</th>`).join('');
  const sourceRows = warmup.source.map(row => `<tr>${row.map(value => `<td>${escapeHtml(String(value))}</td>`).join('')}</tr>`).join('');
  const questions = warmup.questions.map(question => `<li>${escapeHtml(question)}</li>`).join('');
  return `<details class="ddl-warmup"><summary>${escapeHtml(warmup.title)}</summary><p>${escapeHtml(warmup.intro)}</p><div class="ddl-warmup-data"><table><thead><tr>${headings}</tr></thead><tbody>${sourceRows}</tbody></table></div><p class="ddl-warmup-prompt-title">Observe os dados:</p><ol class="ddl-warmup-prompts">${questions}</ol><p class="ddl-warmup-sequence">Este exemplo não pontua. Use suas observações para elaborar a solução da fase.</p></details>`;
}

async function loadTestTools() {
  const data = await api(`/api/game?action=test-tools&phase_id=${phaseId}`);
  const area = $('testTools');
  area.hidden = false;
  area.innerHTML = `${renderValidationGuide(data, 'testReset')}<p id="testResetFeedback" class="retake-feedback" role="alert" aria-live="assertive"></p>`;
  $('testReset').addEventListener('click', async () => {
    if (!await confirmInPage({
      title: 'Refazer atividade de teste',
      message: 'O progresso desta conta de teste, as consultas e as respostas desta fase serão apagados.',
      confirmLabel: 'Apagar e refazer'
    })) return;

    const button = $('testReset');
    button.disabled = true;
    try {
      await api('/api/game?action=reset-test-activity', { method: 'POST', body: { phase_id: phaseId } });
      location.reload();
    } catch (error) {
      button.disabled = false;
      $('testResetFeedback').textContent = error.message;
    }
  });
}

function render() {
  const codeValue = $('accessCodeInput')?.value || '';
  const selectedConcept = document.querySelector('input[name="conceptAnswer"]:checked')?.value;
  const conceptFeedback = $('conceptFeedback')?.textContent || '';
  const verdictText = $('verdict')?.textContent || '';
  const verdictClass = $('verdict')?.className || 'verdict';
  const done = lesson.objectives.filter(([key]) => milestones.has(key)).length;
  $('objectiveCounter').textContent = `${String(done).padStart(2, '0')}/${String(lesson.objectives.length).padStart(2, '0')}`;
  $('objectiveList').innerHTML = lesson.objectives.map(([key, label]) => `<div class="objective-item ${milestones.has(key) ? 'done' : ''}"><span class="check">${milestones.has(key) ? '✓' : '·'}</span><span>${escapeHtml(label)}</span></div>`).join('');
  const pct = Math.round(done / lesson.objectives.length * 100);
  $('progressText').textContent = `${pct}% DECODIFICADO`;
  $('progressBar').style.width = `${pct}%`;
  $('hintCounter').textContent = `${hintIndex}/${lesson.hints.length}`;
  $('hintBtn').disabled = hintIndex >= lesson.hints.length;
  $('finishArea').innerHTML = `
    ${concept ? `<section class="concept-check"><span class="classified">CHECAGEM CONCEITUAL</span>${conceptDone ? '<p class="concept-confirmed">✓ CONCEITO VALIDADO</p>' : `<form id="conceptForm" class="concept-form"><fieldset><legend>${escapeHtml(concept.prompt)}</legend><div class="concept-options">${concept.options.map(([value, label]) => `<label class="concept-option"><input type="radio" name="conceptAnswer" value="${escapeHtml(value)}" required><span>${escapeHtml(label)}</span></label>`).join('')}</div></fieldset><button type="submit">Validar conceito</button><p id="conceptFeedback" class="concept-feedback" role="status" aria-live="polite"></p></form>`}</section>` : ''}
    <section class="final-identification">
      <span class="dashboard-kicker">RESPOSTA FINAL</span>
      <h2>IDENTIFICAÇÃO</h2>
      <p>${escapeHtml(lesson.answerPrompt)}</p>
      <form id="codeForm"><label for="accessCodeInput">Código de conclusão</label><div class="crt-input-row"><input id="accessCodeInput" placeholder="código de conclusão" autocomplete="off" required><button id="completeBtn" type="submit" ${done < lesson.objectives.length || !conceptDone ? 'disabled' : ''}>Concluir atividade</button></div><div id="verdict" class="verdict" aria-live="polite"></div></form>
    </section>
    ${renderRetakeControl()}`;
  $('accessCodeInput').value = codeValue;
  if (selectedConcept) {
    const choice = [...document.querySelectorAll('input[name="conceptAnswer"]')].find(input => input.value === selectedConcept);
    if (choice) choice.checked = true;
  }
  if ($('conceptFeedback')) $('conceptFeedback').textContent = conceptFeedback;
  $('verdict').textContent = verdictText;
  $('verdict').className = verdictClass;
  $('codeForm').addEventListener('submit', complete);
  $('conceptForm')?.addEventListener('submit', answerConcept);
  $('retakeBtn')?.addEventListener('click', startRetake);
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
    await api('/api/game?action=retake-activity', { method: 'POST', body: { phase_id: phaseId } });
    location.reload();
  } catch (error) {
    button.disabled = false;
    $('retakeFeedback').textContent = error.message;
  }
}

function statementForFeedback(query) {
  return String(query || '').replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
}

function readOnlyPreview(result, query = '') {
  const statement = statementForFeedback(query);
  const returnsRows = /^(SELECT|WITH)\b/i.test(statement);
  if (!result.length) {
    const message = returnsRows
      ? 'A consulta foi executada, mas não retornou linhas. Confira o nome da tabela e os filtros aplicados.'
      : 'Comando executado. Esta instrução não retorna uma tabela de resultados; consulte os dados com SELECT ou use o botão estrutura.';
    return `<div class="empty-result"><span>${returnsRows ? '!' : '✓'}</span><p>${message}</p></div>`;
  }

  return result.map(set => {
    const hasRows = set.values.length > 0;
    const emptyMessage = !hasRows
      ? 'A consulta foi executada, mas não encontrou linhas. Confira o nome da tabela e os filtros aplicados.'
      : '';
    return `${emptyMessage ? `<div class="empty-result"><span>!</span><p>${emptyMessage}</p></div>` : ''}<div class="query-meta">${set.values.length} linha(s) retornada(s)</div><table class="result-table"><thead><tr>${set.columns.map(value => `<th>${escapeHtml(value)}</th>`).join('')}</tr></thead><tbody>${set.values.slice(0, 100).map(row => `<tr>${row.map(value => `<td>${renderQueryResultCell(value, { linkExternal: true })}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }).join('');
}

function queryFeedback(query, result) {
  const statement = statementForFeedback(query);
  const rowCount = result.reduce((total, set) => total + set.values.length, 0);
  if (rowCount > 0) return `CONSULTA EXECUTADA // ${rowCount} linha(s) retornada(s)`;
  if (/^(CREATE|ALTER|INSERT|UPDATE|DELETE|BEGIN|COMMIT|ROLLBACK)\b/i.test(statement)) {
    return 'COMANDO EXECUTADO // sem tabela de resultados';
  }
  return 'CONSULTA EXECUTADA // 0 linhas retornadas; confira tabela e filtros';
}

async function executeSql() {
  if (!ready) return;
  const query = sqlToExecute($('sqlEditor'));
  if (!query) return;
  $('runBtn').disabled = true;
  try {
    const response = await api('/api/game?action=query', { method: 'POST', body: { phase_id: phaseId, query } });
    milestones = new Set(response.milestones);
    if (phaseId === 4 && response.tables) renderTableButtons(response.tables);
    render();
    const result = response.result || [];
    $('resultArea').innerHTML = readOnlyPreview(result, query);
    $('queryFeedback').textContent = queryFeedback(query, result);
    $('queryFeedback').className = 'query-feedback ok';
  } catch (error) {
    $('resultArea').innerHTML = `<div class="sql-error">${escapeHtml(error.message)}</div>`;
    $('queryFeedback').textContent = 'ERRO // instrução rejeitada';
    $('queryFeedback').className = 'query-feedback error';
  } finally {
    $('runBtn').disabled = false;
  }
}

async function answerConcept(event) {
  event.preventDefault();
  const answer = new FormData(event.currentTarget).get('conceptAnswer');
  const feedback = $('conceptFeedback');
  try {
    const result = await api('/api/game?action=concept-answer', { method: 'POST', body: { phase_id: phaseId, answer } });
    conceptDone = true;
    if (result.milestones) milestones = new Set(result.milestones);
    render();
  } catch (error) { feedback.textContent = error.message; }
}

async function complete(event) {
  event.preventDefault();
  const answer = $('accessCodeInput').value;
  try {
    const result = await api('/api/game?action=complete', { method: 'POST', body: { phase_id: phaseId, answer } });
    alreadyCompleted = true;
    retakeActive = false;
    render();
    $('verdict').textContent = `✓ ATIVIDADE CONCLUÍDA // ${result.reward}`;
    $('verdict').className = 'verdict success';
  } catch (error) {
    $('verdict').textContent = error.message;
    $('verdict').className = 'verdict failure';
  }
}

$('hintBtn').addEventListener('click', () => {
  if (!lesson) return;
  if (hintIndex >= lesson.hints.length) return;
  $('hintText').innerHTML = `&gt; ${renderHint(lesson.hints[hintIndex++])}`;
  render();
});
$('schemaBtn').addEventListener('click', async () => {
  const editorText = $('sqlEditor').value;
  const match = editorText.match(/\b(?:FROM|JOIN|TABLE)\s+([a-z_][a-z0-9_]*)/i);
  const tables = phaseId === 4 ? [...lesson.tables, 'observadores', 'observacoes_catalogo'] : lesson.tables;
  const selected = match?.[1]?.toLowerCase();
  const table = selected && tables.includes(selected) ? selected : tables[0];
  const button = $('schemaBtn');
  button.disabled = true;
  $('queryFeedback').className = 'query-feedback';
  $('queryFeedback').textContent = `CONSULTANDO ESTRUTURA // ${table}`;
  try {
    const data = await api('/api/game?action=schema', { method: 'POST', body: { phase_id: phaseId, table } });
    $('resultArea').innerHTML = renderSchema(table, data.columns);
    $('queryFeedback').className = 'query-feedback ok';
    $('queryFeedback').textContent = `ESTRUTURA // ${table} // ${data.columns.length} coluna(s)`;
  } catch (error) {
    $('resultArea').innerHTML = `<div class="sql-error">${escapeHtml(error.message)}</div>`;
    $('queryFeedback').className = 'query-feedback error';
    $('queryFeedback').textContent = 'ERRO // estrutura indisponível';
  } finally {
    button.disabled = false;
  }
});
$('clearBtn').addEventListener('click', () => { setEditorValue(''); });
$('runBtn').addEventListener('click', executeSql);
$('sqlEditor').addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); executeSql(); }
});
init();
