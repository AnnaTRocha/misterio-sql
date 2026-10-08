import { api, escapeHtml, requireSession } from './api-client.js';

const phaseId = Number(new URLSearchParams(location.search).get('id'));
const $ = id => document.getElementById(id);
let ready = false;
let lesson;
let milestones = new Set();
let hintIndex = 0;

async function init() {
  const user = await requireSession('student');
  if (!user) return;
  $('username').textContent = user.username;
  try {
    const start = await api('/api/game?action=start', { method: 'POST', body: { phase_id: phaseId } });
    lesson = start.lesson;
    milestones = new Set(start.milestones);
    document.body.dataset.theme = lesson.theme;
    document.querySelector('.brand span:last-child').textContent = lesson.code;
    document.title = `${lesson.title} — Mistério SQL`;
    $('phaseLabel').textContent = `${lesson.code} // AULA ${String(phaseId).padStart(2, '0')}`;
    $('phaseTitle').textContent = lesson.title;
    $('phaseTitle').dataset.text = lesson.title;
    $('phaseMission').textContent = lesson.mission;
    $('terminalName').textContent = `/curso/3301/aula_${String(phaseId).padStart(2, '0')}.sql`;
    $('storyLog').innerHTML = `<p>${escapeHtml(lesson.mission)}</p><p>Execute uma instrução por vez. Alterações acontecem apenas na sua cópia de investigação.</p>`;
    $('sqlEditor').value = lesson.initial;
    $('tableButtons').innerHTML = lesson.tables.map(name => `<button class="db-button" data-table="${escapeHtml(name)}" type="button">${escapeHtml(name)}</button>`).join('');
    document.querySelectorAll('[data-table]').forEach(button => button.addEventListener('click', () => {
      $('sqlEditor').value = `SELECT * FROM ${button.dataset.table};`;
    }));
    render();
    ready = true;
    $('runBtn').disabled = false;
    $('queryFeedback').textContent = 'CONEXÃO ESTABELECIDA // cópia isolada carregada';
    if (user.is_test) await loadTestTools();
  } catch (error) {
    $('queryFeedback').textContent = `FALHA // ${error.message}`;
  }
}

async function loadTestTools() {
  const data = await api(`/api/game?action=test-tools&phase_id=${phaseId}`);
  const area = $('testTools');
  area.hidden = false;
  area.innerHTML = `<div class="test-tools-heading"><div><h2>Ferramentas de teste</h2><p>Consultas de referência para conferir os requisitos desta atividade.</p></div><button id="testReset" class="test-reset-btn" type="button">Refazer atividade</button></div>
    <div class="test-sql-list">${data.expected_sql.map(item => `<article class="test-sql-item"><strong>${escapeHtml(item.step)} // ${escapeHtml(item.objective)}</strong><pre>${escapeHtml(item.sql)}</pre></article>`).join('')}</div>`;
  $('testReset').addEventListener('click', async () => {
    if (!confirm('Refazer esta atividade e apagar o progresso desta conta de teste?')) return;
    await api('/api/game?action=reset-test-activity', { method: 'POST', body: { phase_id: phaseId } });
    location.reload();
  });
}

function render() {
  const done = lesson.objectives.filter(([key]) => milestones.has(key)).length;
  $('objectiveCounter').textContent = `${String(done).padStart(2, '0')}/${String(lesson.objectives.length).padStart(2, '0')}`;
  $('objectiveList').innerHTML = lesson.objectives.map(([key, label]) => `<div class="objective-item ${milestones.has(key) ? 'done' : ''}"><span class="check">${milestones.has(key) ? '✓' : '·'}</span><span>${escapeHtml(label)}</span></div>`).join('');
  const pct = Math.round(done / lesson.objectives.length * 100);
  $('progressText').textContent = `${pct}% DECODIFICADO`;
  $('progressBar').style.width = `${pct}%`;
  $('hintCounter').textContent = `${hintIndex}/${lesson.hints.length}`;
  $('hintBtn').disabled = hintIndex >= lesson.hints.length;
  $('finishArea').innerHTML = `
    <span class="dashboard-kicker">PROTOCOLO FINAL</span>
    <h2>IDENTIFICAÇÃO</h2>
    <p>Complete todos os requisitos e informe a identificação descoberta nesta etapa.</p>
    ${phaseId === 9 && !milestones.has('nosql') ? `<form id="nosqlForm"><label for="nosqlInput">Revisão rápida: qual método consulta documentos de uma coleção no MongoDB?</label><div class="crt-input-row"><input id="nosqlInput" autocomplete="off" required><button type="submit">Validar NoSQL</button></div></form>` : ''}
    <form id="codeForm"><div class="crt-input-row"><input id="accessCodeInput" placeholder="identificação" autocomplete="off" required><button id="completeBtn" type="submit" ${done < lesson.objectives.length ? 'disabled' : ''}>Concluir atividade</button></div><div id="verdict" class="verdict" aria-live="polite"></div></form>`;
  $('codeForm').addEventListener('submit', complete);
  $('nosqlForm')?.addEventListener('submit', answerNosql);
}

function readOnlyPreview(result) {
  if (!result.length) return '<div class="empty-result"><span>✓</span><p>Instrução executada. Confira a estrutura ou os dados com SELECT/PRAGMA.</p></div>';
  return result.map(set => `<div class="query-meta">${set.values.length} linha(s)</div><table class="result-table"><thead><tr>${set.columns.map(value => `<th>${escapeHtml(value)}</th>`).join('')}</tr></thead><tbody>${set.values.slice(0, 100).map(row => `<tr>${row.map(value => `<td>${escapeHtml(value == null ? 'NULL' : String(value))}</td>`).join('')}</tr>`).join('')}</tbody></table>`).join('');
}

async function executeSql() {
  if (!ready) return;
  const query = $('sqlEditor').value.trim();
  if (!query) return;
  $('runBtn').disabled = true;
  try {
    const response = await api('/api/game?action=query', { method: 'POST', body: { phase_id: phaseId, query } });
    milestones = new Set(response.milestones);
    render();
    $('resultArea').innerHTML = readOnlyPreview(response.result || []);
    $('queryFeedback').textContent = 'OK // consulta registrada e requisitos atualizados';
    $('queryFeedback').className = 'query-feedback ok';
  } catch (error) {
    $('resultArea').innerHTML = `<div class="sql-error">${escapeHtml(error.message)}</div>`;
    $('queryFeedback').textContent = 'ERRO // instrução rejeitada';
    $('queryFeedback').className = 'query-feedback error';
  } finally {
    $('runBtn').disabled = false;
  }
}

async function answerNosql(event) {
  event.preventDefault();
  try {
    const result = await api('/api/game?action=nosql-answer', { method: 'POST', body: { answer: $('nosqlInput').value } });
    milestones = new Set(result.milestones);
    render();
  } catch (error) { alert(error.message); }
}

async function complete(event) {
  event.preventDefault();
  const answer = $('accessCodeInput').value;
  try {
    const result = await api('/api/game?action=complete', { method: 'POST', body: { phase_id: phaseId, answer } });
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
  $('hintText').textContent = `> ${lesson.hints[hintIndex++]}`;
  render();
});
$('schemaBtn').addEventListener('click', () => {
  $('sqlEditor').value = `PRAGMA table_info(${lesson.tables[0]});`;
});
$('clearBtn').addEventListener('click', () => { $('sqlEditor').value = ''; });
$('runBtn').addEventListener('click', executeSql);
$('sqlEditor').addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); executeSql(); }
});
init();
