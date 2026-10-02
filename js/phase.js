import { api, escapeHtml, requireSession } from './api-client.js';

const phaseId = Number(new URLSearchParams(location.search).get('id'));
const TABLES = ['usuarios', 'mensagens', 'arquivos', 'pessoas', 'acessos'];

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
      ['users', '1.1 // Explorar a tabela usuarios'],
      ['projection', '1.2 // Selecionar colunas específicas em uma consulta'],
      ['messages', '1.3 // Encontrar as mensagens do usuário desconhecido']
    ],
    hints: [
      'Comece com SELECT * FROM usuarios; e procure algo fora do padrão.',
      'O usuário id 3 aparece como desconhecido. Tente selecionar apenas as colunas que interessam.',
      'Mensagens possuem remetente_id. Procure registros enviados pelo id 3.',
      'A segunda mensagem do remetente 3 contém o código necessário para abrir o próximo arquivo.'
    ],
    initial: 'SELECT * FROM usuarios;'
  },
  2: {
    code: 'INCIDENTE 1987',
    title: '1987',
    mission: 'Reconstrua o incidente de 17/09/1987. Cada etapa exige uma técnica de DQL e reduz o ruído até restar um único usuário e um código.',
    story: [
      '17/09/1987 // Um acesso irregular foi registrado durante a madrugada.',
      'Os relatórios foram fragmentados. Há pessoas, entradas, saídas e terminais, mas nenhuma conclusão pronta.',
      'Resolva as seis etapas na ordem que preferir. O banco só entrega o que sua consulta conseguir provar.'
    ],
    objectives: [
      ['witness', '2.1 // Testemunha: idade 20–30 e nome iniciado por A'],
      ['missing', '2.2 // Registro ausente: localizar uma saída NULL'],
      ['cities', '2.3 // Cidades: remover repetições com DISTINCT'],
      ['last_access', '2.4 // Último acesso: ordenar por data_hora DESC'],
      ['frequency', '2.5 // Maior frequência: contar acessos por pessoa'],
      ['code', '2.6 // Código: isolar dia 17/09 à 21/09, identificar o usuário e coletar o código']
    ],
    hints: [
      "2.1 // SELECT * FROM pessoas WHERE idade BETWEEN 20 AND 30 AND nome LIKE 'A%';",
      '2.2 // Em acessos, um registro não possui hora de saída. Use IS NULL.',
      '2.3 // Liste apenas cidade e elimine valores repetidos com DISTINCT.',
      '2.4 // Ordene acessos por data_hora do mais recente para o mais antigo.',
      '2.5 // Agrupe por pessoa_id, use COUNT(*) AS acessos e ordene pela contagem.',
      "2.6 // Conte acessos por usuario_id entre '1987-09-17' e '1987-09-21'. Depois consulte o usuário que liderar o resultado."
    ],
    initial: 'SELECT * FROM pessoas;'
  }
};

let db;
let hintIndex = 0;
let milestones = new Set();
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
  document.getElementById('phaseLabel').textContent = `${phase.code} // FASE ${String(phaseId).padStart(2, '0')}`;
  setTitle(phase.title);
  document.getElementById('phaseMission').textContent = phase.mission;
  document.getElementById('terminalName').textContent = `/archive/3301/fase_${String(phaseId).padStart(2, '0')}.sql`;
  document.getElementById('storyLog').innerHTML = phase.story.map(item => `<p>${escapeHtml(item)}</p>`).join('');
  editor.value = phase.initial;

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
    renderObjectives();
  } catch (error) {
    feedback.className = 'query-feedback error';
    feedback.textContent = error.message;
    return setTimeout(() => location.replace('/dashboard.html'), 1200);
  }

  await loadDatabase();
}

function setTitle(text) {
  const element = document.getElementById('phaseTitle');
  element.textContent = text;
  element.dataset.text = text;
}

function renderTables() {
  document.getElementById('tableButtons').innerHTML = TABLES
    .map(table => `<button class="db-button" type="button" data-table="${table}">${table}</button>`)
    .join('');

  document.querySelectorAll('.db-button').forEach(button => {
    button.addEventListener('click', () => {
      editor.value = `SELECT * FROM ${button.dataset.table};`;
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
  document.getElementById('hintText').textContent = `> ${phase.hints[hintIndex++]}`;
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
  const description = phaseId === 1
    ? 'Digite o código encontrado nas mensagens do usuário desconhecido.'
    : 'Quando a etapa 2.6 revelar a identidade, use o código armazenado no cadastro do usuário.';

  area.innerHTML = `
    <span class="dashboard-kicker">PROTOCOLO FINAL</span>
    <h2>${title}</h2>
    <p id="completionHint">${description}</p>
    <form id="codeForm">
      <div class="crt-input-row">
        <input id="accessCodeInput" placeholder="código de acesso" autocomplete="off" required>
        <button id="completeBtn" class="primary-btn" type="submit" disabled>Validar código</button>
      </div>
      <div id="verdict" class="verdict" aria-live="polite"></div>
    </form>`;

  document.getElementById('codeForm').addEventListener('submit', complete);
  updateCompletion();
}

function updateCompletion() {
  const button = document.getElementById('completeBtn');
  if (!button) return;

  const required = PHASES[phaseId].objectives.map(([key]) => key);
  const ready = required.every(key => milestones.has(key));
  button.disabled = !ready;

  const hint = document.getElementById('completionHint');
  if (!hint) return;

  if (ready) {
    hint.textContent = phaseId === 1
      ? 'A trilha do usuário desconhecido está completa. Informe o código encontrado nas mensagens.'
      : 'As seis etapas foram reconstruídas. Informe o código associado ao usuário 37.';
  }
}

async function loadDatabase() {
  try {
    if (typeof initSqlJs !== 'function') throw new Error('Biblioteca SQL não carregada.');

    const SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
    });
    const response = await fetch('data/caso.sql', { cache: 'no-store' });
    if (!response.ok) throw new Error('Falha ao acessar o Arquivo 3301.');

    db = new SQL.Database();
    db.run(await response.text());
    runBtn.disabled = false;
    feedback.className = 'query-feedback ok';
    feedback.textContent = 'CONEXÃO ESTABELECIDA // arquivo 3301 montado';
  } catch (error) {
    feedback.className = 'query-feedback error';
    feedback.textContent = `FALHA // ${error.message}`;
    renderError(error.message);
  }
}

function isReadOnly(sql) {
  const cleaned = sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();

  return /^(SELECT|WITH|PRAGMA\s+table_info)/i.test(cleaned) &&
    !/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|ATTACH|DETACH|VACUUM)\b/i.test(cleaned);
}

async function executeSql() {
  if (!db) return;

  const query = editor.value.trim();
  if (!query) return renderError('Nenhum comando recebido.');
  if (!isReadOnly(query)) {
    return renderError('Acesso negado: somente consultas de leitura SELECT/WITH são permitidas.');
  }

  runBtn.disabled = true;
  feedback.className = 'query-feedback';
  feedback.textContent = 'EXECUTANDO // lendo setores do arquivo...';

  try {
    const resultSets = db.exec(query);
    const log = await api('/api/game?action=query', {
      method: 'POST',
      body: { phase_id: phaseId, query, executed: true }
    });

    milestones = new Set(log.milestones || []);
    renderObjectives();
    renderResults(resultSets);
    addHistory(query, true);

    const rows = resultSets.reduce((count, set) => count + set.values.length, 0);
    feedback.className = 'query-feedback ok';
    feedback.textContent = `OK // ${rows} linha(s) retornada(s) // investigação atualizada`;
  } catch (error) {
    try {
      await api('/api/game?action=query', {
        method: 'POST',
        body: { phase_id: phaseId, query, executed: false }
      });
    } catch {
      // O erro principal continua sendo a consulta SQL executada localmente.
    }

    addHistory(query, false);
    renderError(`Erro SQL: ${error.message}`);
    feedback.className = 'query-feedback error';
    feedback.textContent = 'ERRO // comando rejeitado';
  } finally {
    runBtn.disabled = !db;
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
        `<tr>${row.map(value => `<td>${escapeHtml(value ?? 'NULL')}</td>`).join('')}</tr>`
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
  const verdict = document.getElementById('verdict');
  const button = document.getElementById('completeBtn');

  try {
    button.disabled = true;
    const data = await api('/api/game?action=complete', {
      method: 'POST',
      body: {
        phase_id: phaseId,
        answer: document.getElementById('accessCodeInput').value
      }
    });

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

function showStructure() {
  const match = editor.value.match(/\b(?:FROM|JOIN)\s+([a-z_][a-z0-9_]*)/i);
  const table = match?.[1] && TABLES.includes(match[1].toLowerCase())
    ? match[1].toLowerCase()
    : TABLES[0];

  editor.value = `PRAGMA table_info(${table});`;
  editor.focus();
}

document.getElementById('hintBtn').addEventListener('click', revealHint);
document.getElementById('schemaBtn').addEventListener('click', showStructure);
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
