import { api, escapeHtml, requireSession } from './api-client.js';

const root = document.getElementById('assessmentContent');
// As colunas vêm da API; esta ordem coloca as tabelas relacionadas lado a lado.
const diagramOrder = ['clientes', 'pedidos', 'itens_pedido', 'produtos', 'vendedores'];
const foreignKeys = {
  pedidos: ['id_cliente'], itens_pedido: ['id_pedido', 'id_produto'], produtos: ['id_vendedor']
};
const primaryKeys = {
  clientes: 'id_cliente', pedidos: 'id_pedido', itens_pedido: 'id_item_pedido',
  produtos: 'id_produto', vendedores: 'id_vendedor'
};
function renderSchema(schema) {
  const tables = new Map(schema.map(entry => {
    const match = /^(\w+)\(([^)]+)\)$/.exec(entry);
    return match ? [match[1], match[2].split(',').map(column => column.trim())] : [entry, []];
  }));
  return diagramOrder.map((name, index) => {
    const columns = tables.get(name) || [];
    const card = `<article class="schema-entity"><h4>${escapeHtml(name)}</h4><ul>${columns.map(column => {
      const key = primaryKeys[name] === column ? 'PK' : foreignKeys[name]?.includes(column) ? 'FK' : '';
      return `<li><code>${escapeHtml(column)}</code>${key ? `<span class="schema-key ${key.toLowerCase()}">${key}</span>` : ''}</li>`;
    }).join('')}</ul></article>`;
    return `${card}${index < diagramOrder.length - 1 ? '<div class="schema-connector" aria-hidden="true"><span></span></div>' : ''}`;
  }).join('');
}
async function load() {
  try {
    const user = await requireSession('student');
    if (!user) return;
    const draftKey = `marketplace-draft:${user.id || user.username}`;
    const data = await api('/api/game?action=marketplace');
    if (data.submission) {
      try { localStorage.removeItem(draftKey); } catch { /* armazenamento indisponível */ }
      root.innerHTML = `<section class="assessment-notice assessment-result"><span class="assessment-eyebrow">AVALIAÇÃO ENVIADA</span><h2>Seu resultado</h2><strong>${escapeHtml(data.submission.score)}%</strong><p>${data.submission.correct.filter(Boolean).length} de ${data.submission.correct.length} questões corretas.</p></section>`;
      return;
    }
    if (!data.released) { root.innerHTML = '<section class="assessment-notice"><span class="assessment-eyebrow">AGUARDANDO LIBERAÇÃO</span><h2>Avaliação indisponível</h2><p>O professor ainda não liberou esta avaliação.</p></section>'; return; }
    root.innerHTML = `<section class="assessment-intro" aria-labelledby="instructions-title">
      <div><span class="assessment-section-number">01 / ORIENTAÇÕES</span><h2 id="instructions-title">Antes de começar</h2>
        <p>Escreva uma consulta SQL para cada questão. Você pode executá-las para conferir os resultados antes de enviar.</p></div>
      <div class="assessment-facts"><div><strong>${data.questions.length}</strong><span>questões de mesmo peso</span></div><div><strong>1</strong><span>envio definitivo</span></div><div><strong>SQL</strong><span>consultas relacionais</span></div></div>
      <ul class="assessment-rules"><li>Respostas vazias ou consultas inválidas contam como incorretas.</li><li>Retorne as colunas na ordem solicitada. A ordem das linhas só é avaliada quando o enunciado pedir ordenação.</li><li>O preço unitário dos itens é o preço registrado no pedido. O rascunho é salvo neste navegador, quando disponível.</li></ul>
    </section>
    <section class="schema-section" aria-labelledby="schema-title">
      <div class="assessment-section-heading"><div><span class="assessment-section-number">02 / BANCO DE DADOS</span><h2 id="schema-title">Estrutura do marketplace</h2><p>Consulte as tabelas e os relacionamentos enquanto resolve a avaliação.</p></div><span class="schema-legend"><span><b class="schema-key pk">PK</b> chave primária</span><span><b class="schema-key fk">FK</b> chave estrangeira</span></span></div>
      <p class="schema-scroll-hint">Deslize para ver todas as tabelas →</p>
      <div class="schema-scroll" tabindex="0" role="region" aria-label="Diagrama das tabelas, role horizontalmente para ver todas"><div class="schema-diagram">${renderSchema(data.schema)}</div></div>
      <div class="schema-relations"><strong>Relacionamentos</strong><ul>
        <li><code>pedidos.id_cliente</code> → <code>clientes.id_cliente</code></li>
        <li><code>itens_pedido.id_pedido</code> → <code>pedidos.id_pedido</code></li>
        <li><code>itens_pedido.id_produto</code> → <code>produtos.id_produto</code></li>
        <li><code>produtos.id_vendedor</code> → <code>vendedores.id_vendedor</code></li>
      </ul></div>
    </section>
    <section class="assessment-questions" aria-labelledby="questions-title"><div class="assessment-section-heading"><div><span class="assessment-section-number">03 / QUESTÕES</span><h2 id="questions-title">Suas consultas</h2><p>Digite uma consulta por questão e execute para visualizar o resultado.</p></div><span class="question-count">${data.questions.length} QUESTÕES</span></div>
      <form id="assessmentForm">${data.questions.map((question, i) => `<fieldset class="question-card"><legend class="sr-only">Questão ${i + 1}</legend><div class="question-header"><span>QUESTÃO ${String(i + 1).padStart(2, '0')}</span><span>${String(i + 1).padStart(2, '0')} / ${String(data.questions.length).padStart(2, '0')}</span></div><label for="q${i}">${escapeHtml(question)}</label><div class="query-editor"><div class="query-editor-label"><span>CONSULTA SQL</span><span>SQL</span></div><textarea id="q${i}" name="q${i}" maxlength="5000" spellcheck="false" placeholder="Escreva sua consulta aqui..."></textarea></div><div class="question-actions"><button type="button" class="run-query" data-preview="${i}"><span aria-hidden="true">▶</span> Executar consulta</button><span>Visualização de até 100 linhas</span></div><div class="query-result" id="result${i}" aria-live="polite"></div></fieldset>`).join('')}
      <div class="assessment-submit"><div><strong>Pronto para enviar?</strong><p>Confira suas respostas. Após o envio, elas não poderão ser alteradas.</p></div><button type="submit">Enviar avaliação <span aria-hidden="true">→</span></button></div><span id="feedback" role="alert"></span></form></section>`;
    const form = document.getElementById('assessmentForm');
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey) || '[]');
      if (Array.isArray(draft)) data.questions.forEach((_, i) => { if (typeof draft[i] === 'string') form.elements[`q${i}`].value = draft[i]; });
    } catch { /* armazenamento indisponível ou rascunho inválido */ }
    form.addEventListener('input', () => {
      try { localStorage.setItem(draftKey, JSON.stringify(data.questions.map((_, i) => form.elements[`q${i}`].value))); } catch { /* armazenamento indisponível */ }
    });
    form.querySelectorAll('[data-preview]').forEach(button => button.addEventListener('click', async () => {
      const i = button.dataset.preview;
      const result = document.getElementById(`result${i}`);
      button.disabled = true;
      try {
        const response = await api('/api/game?action=marketplace-query', { method: 'POST', body: { query: form.elements[`q${i}`].value } });
        const set = response.result[0];
        result.innerHTML = set ? `<div class="table-wrap"><table class="result-table"><thead><tr>${set.columns.map(value => `<th>${escapeHtml(value)}</th>`).join('')}</tr></thead><tbody>${set.values.map(row => `<tr>${row.map(value => `<td>${escapeHtml(value === null ? 'NULL' : value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p>${set.values.length} linha(s), até 100 exibidas.</p>` : '<p>Nenhuma linha retornada.</p>';
      } catch (error) { result.textContent = error.message; }
      finally { button.disabled = false; }
    }));
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!confirm('Enviar a avaliação? Depois do envio, as respostas não poderão ser alteradas.')) return;
      const button = form.querySelector('button[type=submit]'); button.disabled = true;
      try {
        await api('/api/game?action=marketplace-submit', { method: 'POST', body: { answers: data.questions.map((_, i) => form.elements[`q${i}`].value) } });
        await load();
      } catch (error) { document.getElementById('feedback').textContent = error.message; button.disabled = false; }
    });
  } catch (error) { root.textContent = error.message; }
}
load();
