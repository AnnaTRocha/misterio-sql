import { api, escapeHtml, requireSession } from './api-client.js';

const root = document.getElementById('assessmentContent');
async function load() {
  try {
    const user = await requireSession('student');
    if (!user) return;
    const draftKey = `marketplace-draft:${user.id || user.username}`;
    const data = await api('/api/game?action=marketplace');
    if (data.submission) {
      try { localStorage.removeItem(draftKey); } catch { /* armazenamento indisponível */ }
      root.innerHTML = `<p>Avaliação enviada. Resultado: <strong>${escapeHtml(data.submission.score)}%</strong>.</p><p>Acertos: ${data.submission.correct.filter(Boolean).length} de ${data.submission.correct.length}.</p>`;
      return;
    }
    if (!data.released) { root.textContent = 'A avaliação ainda não foi liberada pelo professor.'; return; }
    root.innerHTML = `<p>Escreva uma consulta SQLite para cada questão. Todas têm o mesmo peso. O envio é único; respostas vazias ou consultas inválidas contam como incorretas. Após enviar, você verá sua nota. O rascunho é salvo neste navegador, quando disponível.</p>
      <p>Retorne as colunas na ordem solicitada. A ordem das linhas só é avaliada quando o enunciado pedir ordenação. O preço unitário dos itens é o preço registrado no pedido.</p>
      <h2>Estrutura do banco</h2><ul>${data.schema.map(table => `<li><code>${escapeHtml(table)}</code></li>`).join('')}</ul>
      <p>As colunas <code>id_cliente</code>, <code>id_vendedor</code>, <code>id_produto</code> e <code>id_pedido</code> relacionam as tabelas correspondentes.</p>
      <form id="assessmentForm">${data.questions.map((question, i) => `<fieldset><legend>Questão ${i + 1}</legend><label for="q${i}">${escapeHtml(question)}</label><textarea id="q${i}" name="q${i}" maxlength="5000" spellcheck="false"></textarea><button type="button" data-preview="${i}">Executar consulta</button><div id="result${i}" aria-live="polite"></div></fieldset>`).join('')}
      <button type="submit">Enviar avaliação</button> <span id="feedback" role="alert"></span></form>`;
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
        result.innerHTML = set ? `<div class="table-wrap"><table><thead><tr>${set.columns.map(value => `<th>${escapeHtml(value)}</th>`).join('')}</tr></thead><tbody>${set.values.map(row => `<tr>${row.map(value => `<td>${escapeHtml(value === null ? 'NULL' : value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p>${set.values.length} linha(s), até 100 exibidas.</p>` : '<p>Nenhuma linha retornada.</p>';
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
