import { api, escapeHtml, requireSession } from './api-client.js';

const phaseId = Number(new URLSearchParams(location.search).get('id'));
const TABLES = ['ocorrencias', 'pessoas', 'depoimentos', 'acessos', 'veiculos'];
const PHASES = {
  1: {
    code: 'ARQUIVO 18', title: 'O primeiro acesso',
    mission: 'Um notebook desapareceu do Laboratório 2. Explore o banco com SELECT e FROM e descubra quem aparece nas evidências.',
    story: ['02:13:07 // Um terminal desativado voltou a responder.', 'Não há relatório. Só tabelas, rastros e uma ocorrência incompleta.', 'Consulte. Observe. Acuse somente quando os dados sustentarem sua conclusão.'],
    objectives: [['select','Executar uma consulta SELECT'],['explore','Consultar ao menos duas tabelas'],['accuse','Identificar e acusar o responsável']],
    hints: ['Comece pela ocorrência: ela informa onde e quando procurar.', 'SELECT escolhe o que ver; FROM informa a tabela.', 'Tente SELECT * FROM ocorrencias; e depois consulte acessos, pessoas e depoimentos. Não é necessário JOIN ainda.'],
    initial: 'SELECT * FROM ocorrencias;'
  },
  2: {
    code: 'SINAL 02', title: 'Filtrando o ruído',
    mission: 'A base foi replicada. Ler tudo virou ruído. Use DQL para filtrar, organizar e resumir os rastros até decodificar todos os protocolos.',
    story: ['03:31:42 // O arquivo cresceu. Centenas de linhas escondem os mesmos rastros.', 'A leitura bruta não basta. Reduza o conjunto até que o padrão apareça.', 'Cada técnica correta decodifica uma parte do sinal e fica salva no seu progresso.'],
    objectives: [['filter','Filtrar registros com WHERE'],['logic','Combinar condições com AND ou OR'],['special','Usar LIKE, IN, BETWEEN, IS NULL ou NOT'],['order','Ordenar evidências com ORDER BY'],['distinct','Remover repetições com DISTINCT'],['alias','Criar um alias com AS'],['aggregate','Usar GROUP BY + função de agregação']],
    hints: ['Comece reduzindo linhas com WHERE.', 'Depois combine critérios com AND ou OR.', 'Pratique um filtro especial: LIKE, IN, BETWEEN, IS NULL ou NOT.', 'ORDER BY organiza; DISTINCT remove repetições.', 'AS cria um apelido no resultado, por exemplo COUNT(*) AS total.', 'Finalize combinando GROUP BY com COUNT, SUM, AVG, MAX ou MIN. Os objetivos podem ser feitos em consultas separadas.'],
    initial: 'SELECT * FROM pessoas;'
  },
  3: {
    code: 'NÓ 03', title: 'Conectando as evidências',
    mission: 'As pistas foram fragmentadas entre tabelas. Reconstrua uma relação usando JOIN e ON.',
    story: ['04:06:11 // Identidades, acessos e veículos foram separados.', 'Uma tabela isolada já não contém a resposta.', 'Reconstrua as relações antes que o arquivo seja fechado.'],
    objectives: [['join','Executar uma consulta com JOIN ... ON']],
    hints: ['Observe colunas terminadas em _id.', 'Estrutura: SELECT ... FROM tabela_a JOIN tabela_b ON tabela_b.id = tabela_a.algum_id;'],
    initial: 'SELECT * FROM acessos;'
  }
};

let db;
let hintIndex = 0;
let milestones = new Set();
let queriedTables = new Set();
let querySequence = 0;
const editor = document.getElementById('sqlEditor');
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
  document.title = `${phase.title} — Mistério SQL`;
  document.getElementById('phaseLabel').textContent = `${phase.code} // FASE ${String(phaseId).padStart(2,'0')}`;
  setTitle(phase.title);
  document.getElementById('phaseMission').textContent = phase.mission;
  document.getElementById('terminalName').textContent = `/archive/fase_${String(phaseId).padStart(2,'0')}.sql`;
  document.getElementById('storyLog').innerHTML = phase.story.map(x => `<p>${escapeHtml(x)}</p>`).join('');
  editor.value = phase.initial;
  renderTables(); renderHints(); renderObjectives(); renderFinish();
  try {
    const start = await api('/api/game?action=start', { method:'POST', body:{phase_id:phaseId} });
    milestones = new Set(start.milestones || []);
    renderObjectives();
  } catch (error) {
    feedback.className = 'query-feedback error'; feedback.textContent = error.message;
    return setTimeout(() => location.replace('/dashboard.html'), 1200);
  }
  await loadDatabase();
}

function setTitle(text) {
  const el = document.getElementById('phaseTitle'); el.textContent = text; el.dataset.text = text;
}

function renderTables() {
  document.getElementById('tableButtons').innerHTML = TABLES.map(t => `<button class="db-button" type="button" data-table="${t}">${t}</button>`).join('');
  document.querySelectorAll('.db-button').forEach(btn => btn.addEventListener('click', () => {
    editor.value = `SELECT * FROM ${btn.dataset.table};`; editor.focus();
  }));
}

function renderHints() {
  const phase = PHASES[phaseId];
  document.getElementById('hintCounter').textContent = `${hintIndex}/${phase.hints.length}`;
  document.getElementById('hintBtn').disabled = hintIndex >= phase.hints.length;
}

function revealHint() {
  const phase = PHASES[phaseId]; if (hintIndex >= phase.hints.length) return;
  document.getElementById('hintText').textContent = `> ${phase.hints[hintIndex++]}`; renderHints();
}

function effectiveMilestones() {
  const all = new Set(milestones);
  if (phaseId === 1) {
    if (milestones.has('select')) all.add('select');
    if (queriedTables.size >= 2) all.add('explore');
  }
  return all;
}

function renderObjectives() {
  const phase = PHASES[phaseId], doneSet = effectiveMilestones();
  const done = phase.objectives.filter(([key]) => doneSet.has(key)).length;
  document.getElementById('objectiveCounter').textContent = `${String(done).padStart(2,'0')}/${String(phase.objectives.length).padStart(2,'0')}`;
  document.getElementById('objectiveList').innerHTML = phase.objectives.map(([key,label]) => {
    const ok = doneSet.has(key); return `<div class="objective-item ${ok?'done':''}"><span class="check">${ok?'✓':'·'}</span><span>${escapeHtml(label)}</span></div>`;
  }).join('');
  const pct = Math.round((done / phase.objectives.length) * 100);
  document.getElementById('progressText').textContent = `${pct}% DECODIFICADO`;
  document.getElementById('progressBar').style.width = `${pct}%`;
  updateCompletion();
}

function renderFinish() {
  const area = document.getElementById('finishArea');
  if (phaseId === 1) {
    area.innerHTML = `<span class="dashboard-kicker">PROTOCOLO FINAL</span><h2>Quem levou o notebook?</h2><p>Digite o nome completo apenas quando as evidências convergirem.</p><form id="accusationForm"><div class="crt-input-row"><input id="suspectInput" placeholder="nome completo" required><button class="primary-btn">Enviar acusação</button></div><div id="verdict" class="verdict" aria-live="polite"></div></form>`;
    document.getElementById('accusationForm').addEventListener('submit', accuse);
  } else {
    area.innerHTML = `<span class="dashboard-kicker">PROTOCOLO FINAL</span><h2>Encerrar arquivo</h2><p id="completionHint">Decodifique todos os objetivos para liberar o encerramento.</p><button id="completeBtn" class="primary-btn" type="button" disabled>Encerrar fase</button><div id="verdict" class="verdict" aria-live="polite"></div>`;
    document.getElementById('completeBtn').addEventListener('click', complete);
  }
}

function updateCompletion() {
  if (phaseId === 1) return;
  const required = PHASES[phaseId].objectives.map(([k]) => k);
  const ready = required.every(k => milestones.has(k));
  const btn = document.getElementById('completeBtn'); if (!btn) return;
  btn.disabled = !ready;
  document.getElementById('completionHint').textContent = ready ? 'Todos os protocolos foram decodificados. O encerramento está liberado.' : 'Ainda existem protocolos incompletos. Continue experimentando no terminal.';
}

async function loadDatabase() {
  try {
    if (typeof initSqlJs !== 'function') throw new Error('Biblioteca SQL não carregada.');
    const SQL = await initSqlJs({ locateFile:f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}` });
    const response = await fetch('data/caso.sqlite', {cache:'no-store'});
    if (!response.ok) throw new Error('Falha ao acessar o arquivo do caso.');
    db = new SQL.Database(new Uint8Array(await response.arrayBuffer()));
    runBtn.disabled = false; feedback.className = 'query-feedback ok'; feedback.textContent = 'CONEXÃO ESTABELECIDA // banco pronto';
  } catch (error) { feedback.className='query-feedback error'; feedback.textContent=`FALHA // ${error.message}`; renderError(error.message); }
}

function isReadOnly(sql) {
  const q = sql.replace(/--.*$/gm,'').replace(/\/\*[\s\S]*?\*\//g,'').trim();
  return /^(SELECT|WITH|PRAGMA\s+table_info)/i.test(q) && !/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|ATTACH|DETACH|VACUUM)\b/i.test(q);
}

function detectTables(query) {
  TABLES.forEach(t => { if (new RegExp(`\\b${t}\\b`,'i').test(query)) queriedTables.add(t); });
}

async function executeSql() {
  if (!db) return;
  const query = editor.value.trim();
  if (!query) return renderError('Nenhum comando recebido.');
  if (!isReadOnly(query)) return renderError('Acesso negado: somente consultas de leitura SELECT/WITH são permitidas.');
  runBtn.disabled = true; feedback.className='query-feedback'; feedback.textContent='EXECUTANDO // lendo setores do arquivo...';
  try {
    const resultSets = db.exec(query); detectTables(query);
    const log = await api('/api/game?action=query', {method:'POST', body:{phase_id:phaseId,query,executed:true}});
    (log.milestones || []).forEach(x => milestones.add(x));
    if (phaseId === 1) milestones.add('select');
    renderObjectives(); renderResults(resultSets); addHistory(query,true);
    const rows = resultSets.reduce((n,s) => n+s.values.length,0);
    feedback.className='query-feedback ok'; feedback.textContent=`OK // ${rows} linha(s) retornada(s) // consulta registrada`;
  } catch (error) {
    try { await api('/api/game?action=query',{method:'POST',body:{phase_id:phaseId,query,executed:false}}); } catch {}
    addHistory(query,false); renderError(`Erro SQL: ${error.message}`); feedback.className='query-feedback error'; feedback.textContent='ERRO // comando rejeitado';
  } finally { runBtn.disabled = !db; }
}

function renderResults(sets) {
  if (!sets.length) return resultArea.innerHTML='<div class="empty-result"><span>∅</span><p>Nenhum registro encontrado. O vazio também é uma evidência.</p></div>';
  resultArea.innerHTML = sets.map(set => `<div class="query-meta">${set.values.length} linha(s)</div><table class="result-table"><thead><tr>${set.columns.map(c=>`<th>${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>${set.values.slice(0,200).map(row=>`<tr>${row.map(v=>`<td>${escapeHtml(v ?? 'NULL')}</td>`).join('')}</tr>`).join('')}</tbody></table>`).join('');
}

function addHistory(query, ok) {
  const line=document.createElement('div'); line.className='history-line';
  line.innerHTML=`<span>#${String(++querySequence).padStart(2,'0')}</span><code>${escapeHtml(query.replace(/\s+/g,' '))}</code><span class="${ok?'history-ok':'history-error'}">${ok?'OK':'ERRO'}</span>`; history.prepend(line);
}

function renderError(message) { resultArea.innerHTML=`<div class="sql-error">${escapeHtml(message)}</div>`; }

async function complete() {
  const verdict=document.getElementById('verdict');
  try { const data=await api('/api/game?action=complete',{method:'POST',body:{phase_id:phaseId}}); verdict.className='verdict success'; verdict.textContent=`✓ FASE ENCERRADA // fragmento recuperado: ${data.reward}`; document.getElementById('completeBtn').disabled=true; }
  catch(error){ verdict.className='verdict failure'; verdict.textContent=`✕ ${error.message}`; }
}

async function accuse(event) {
  event.preventDefault(); const verdict=document.getElementById('verdict');
  try { const data=await api('/api/game?action=complete',{method:'POST',body:{phase_id:1,answer:document.getElementById('suspectInput').value}}); milestones.add('accuse'); renderObjectives(); verdict.className='verdict success'; verdict.textContent=`✓ ACUSAÇÃO CONFIRMADA // fragmento recuperado: ${data.reward}`; }
  catch { verdict.className='verdict failure'; verdict.textContent='✕ A acusação não coincide com as evidências armazenadas.'; }
}

function showStructure() {
  const match=editor.value.match(/\b(?:FROM|JOIN)\s+([a-z_][a-z0-9_]*)/i);
  const table=match?.[1] && TABLES.includes(match[1].toLowerCase()) ? match[1].toLowerCase() : TABLES[0];
  editor.value=`PRAGMA table_info(${table});`; editor.focus();
}

document.getElementById('hintBtn').addEventListener('click',revealHint);
document.getElementById('schemaBtn').addEventListener('click',showStructure);
document.getElementById('clearBtn').addEventListener('click',()=>{editor.value='';editor.focus();});
runBtn.addEventListener('click',executeSql);
editor.addEventListener('keydown',event=>{
  if ((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();executeSql();}
  if(event.key==='Tab'){event.preventDefault();const s=editor.selectionStart,e=editor.selectionEnd;editor.value=`${editor.value.slice(0,s)}  ${editor.value.slice(e)}`;editor.selectionStart=editor.selectionEnd=s+2;}
});
init();
