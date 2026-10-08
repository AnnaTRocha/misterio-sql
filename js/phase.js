import { api, escapeHtml, requireSession } from './api-client.js';

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
      ['users', '1.1 // Explorar a tabela usuarios'],
      ['projection', '1.2 // Selecionar colunas específicas em uma consulta'],
      ['messages', '1.3 // Encontrar as mensagens do usuário desconhecido']
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
      ['witness', '2.1 // Testemunha: idade 20–30 e nome iniciado por A'],
      ['missing', '2.2 // Registro ausente: localizar uma saída NULL'],
      ['cities', '2.3 // Cidades: remover repetições com DISTINCT'],
      ['last_access', '2.4 // Último acesso: ordenar por data_hora DESC'],
      ['frequency', '2.5 // Maior frequência: contar acessos por pessoa'],
      ['code', '2.6 // Código: isolar dia 17/09 à 21/09, identificar o usuário e coletar o código']
    ],
    hints: [
      '2.1 // A testemunha pertence a uma faixa etária e seu nome começa com uma letra específica.',
      '2.2 // Uma ausência no registro de saída pode ser mais importante que um valor preenchido.',
      '2.3 // Conte cada cidade apenas uma vez.',
      '2.4 // O acesso mais recente muda a direção da investigação.',
      '2.5 // Frequência exige agrupar pessoas antes de comparar totais.',
      '2.6 // Restrinja a janela do incidente; a identidade está no cadastro de quem mais aparece.'
    ],
    initial: 'SELECT * FROM pessoas;'
  }
};

let ready = false;
let hintIndex = 0;
let milestones = new Set();
let querySequence = 0;
let conceptDone = false;

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
  document.body.dataset.theme = phase.theme || 'archive';
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
    conceptDone = Boolean(start.concept_done);
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
  const title = phaseId === 1 ? 'ACCESS CODE' : phaseId === 3 ? 'IDENTIFICAÇÃO' : 'CÓDIGO FINAL';

  const descriptions = {
    1: 'Digite o código encontrado nas mensagens do usuário desconhecido.',
    2: 'Quando a etapa 2.6 revelar a identidade, use o código armazenado no cadastro do usuário.',
    3: 'Conclua as relações entre as tabelas, abra o recurso externo recuperado e informe o que o símbolo representa.'
  };

  area.innerHTML = `
    <span class="dashboard-kicker">PROTOCOLO FINAL</span>
    <h2>${title}</h2>
    <p id="completionHint">${descriptions[phaseId] || ''}</p>
    ${conceptDone ? '' : `<form id="conceptForm">
      <label for="conceptAnswer">${phaseId === 1 ? 'Qual chave conecta uma tabela a outra?' : 'Na 3ª forma normal, o que deve ser evitado?'}</label>
      <div class="crt-input-row"><select id="conceptAnswer" required>
        <option value="">Selecione uma resposta</option>
        ${phaseId === 1
          ? '<option value="chave_primaria">Uma segunda chave primária</option><option value="chave_estrangeira">Uma chave estrangeira que referencia a chave primária</option><option value="indice">Um índice sem referência</option>'
          : '<option value="listas">Apenas listas em uma célula</option><option value="sem_dependencia_transitiva">Dependência transitiva entre atributos não-chave</option><option value="ordenacao">Ordenação por nome</option>'}
      </select><button type="submit">Validar conceito</button></div>
    </form>`}
    <form id="codeForm">
      <div class="crt-input-row">
        <input id="accessCodeInput" placeholder="${phaseId === 3 ? 'identificação do símbolo' : 'código de acesso'}" autocomplete="off" required>
        <button id="completeBtn" class="primary-btn" type="submit" disabled>Validar ${phaseId === 3 ? 'resposta' : 'código'}</button>
      </div>
      <div id="verdict" class="verdict" aria-live="polite"></div>
    </form>`;

  document.getElementById('codeForm').addEventListener('submit', complete);
  document.getElementById('conceptForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    try {
      await api('/api/game?action=concept-answer', { method: 'POST', body: { phase_id: phaseId, answer: document.getElementById('conceptAnswer').value } });
      conceptDone = true;
      renderFinish();
    } catch (error) { alert(error.message); }
  });
  updateCompletion();
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
      2: 'As seis etapas foram reconstruídas. Informe o código associado à identidade que você identificou.',
      3: 'As relações foram reconstruídas. Abra o recurso externo recuperado e informe o que o símbolo representa.'
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

  return /^(SELECT|WITH|PRAGMA\s+table_info)/i.test(cleaned) &&
    !/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|ATTACH|DETACH|VACUUM)\b/i.test(cleaned);
}

async function executeSql() {
  if (!ready) return;

  const query = editor.value.trim();
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
        `<tr>${row.map(value => `<td>${renderCell(value)}</td>`).join('')}</tr>`
      ).join('')}</tbody>
    </table>`).join('');
}

function renderCell(value) {
  if (value == null) return 'NULL';

  const text = String(value);
  if (phaseId === 3 && /^https:\/\//i.test(text)) {
    return `<a class="external-resource-link" href="${escapeHtml(text)}" target="_blank" rel="noopener noreferrer">[ abrir recurso externo ]</a>`;
  }

  return escapeHtml(text);
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
      : phaseId === 3
        ? `✓ SÍMBOLO IDENTIFICADO // ${data.reward} // ARQUIVO 03 DECODIFICADO`
        : `✓ ARQUIVO 3301 DECODIFICADO // código ${data.reward} confirmado`;
  } catch (error) {
    verdict.className = 'verdict failure';
    verdict.textContent = `✕ ${error.message}`;
    button.disabled = false;
  }
}

function showStructure() {
  const match = editor.value.match(/\b(?:FROM|JOIN)\s+([a-z_][a-z0-9_]*)/i);
  const tables = currentTables();
  const table = match?.[1] && tables.includes(match[1].toLowerCase())
    ? match[1].toLowerCase()
    : tables[0];

  editor.value = `PRAGMA table_info(${table});`;
  editor.focus();
}

async function loadTestTools() {
  const root = document.getElementById('testTools');
  if (!root) return;

  try {
    const data = await api(`/api/game?action=test-tools&phase_id=${phaseId}`);
    const expected = Array.isArray(data.expected_sql) ? data.expected_sql : [];

    root.hidden = false;
    root.innerHTML = `
      <div class="test-tools-heading">
        <div>
          <span class="classified">USUÁRIO TESTE</span>
          <h2>Ferramentas de validação</h2>
          <p>Consultas mínimas esperadas para validar os checklists desta atividade.</p>
        </div>
        <button id="resetTestActivity" class="test-reset-btn" type="button">Refazer atividade</button>
      </div>
      <div class="test-sql-list">
        ${expected.length
          ? expected.map(item => `
            <article class="test-sql-item">
              <strong>${escapeHtml(item.step)} // ${escapeHtml(item.objective)}</strong>
              <pre><code>${escapeHtml(item.sql)}</code></pre>
            </article>`).join('')
          : '<p class="test-empty">Ainda não há SQL mínimo cadastrado para esta fase.</p>'}
      </div>`;

    document.getElementById('resetTestActivity').addEventListener('click', async event => {
      if (!confirm('Refazer esta atividade? Todos os checklists e consultas registradas desta fase serão zerados para este usuário teste.')) return;

      const button = event.currentTarget;
      button.disabled = true;
      button.textContent = 'Zerando atividade...';

      try {
        await api('/api/game?action=reset-test-activity', {
          method: 'POST',
          body: { phase_id: phaseId }
        });
        location.reload();
      } catch (error) {
        button.disabled = false;
        button.textContent = 'Refazer atividade';
        alert(error.message);
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
