import { escapeHtml } from './api-client.js';

export function renderValidationGuide(data, resetButtonId) {
  const expected = Array.isArray(data.expected_sql) ? data.expected_sql : [];
  const concept = data.concept_answer;
  return `<div class="test-tools-heading">
    <div>
      <span class="classified">USUÁRIO TESTE</span>
      <h2>Ferramentas de validação</h2>
      <p>Consultas mínimas esperadas para validar os checklists desta atividade.</p>
    </div>
    <button id="${resetButtonId}" class="test-reset-btn" type="button">Refazer atividade</button>
  </div>
  <div class="test-sql-list">
    ${expected.map(item => `<article class="test-sql-item">
      <strong>${escapeHtml(item.step)} // ${escapeHtml(item.objective)}</strong>
      <pre><code>${escapeHtml(item.sql)}</code></pre>
    </article>`).join('')}
    ${Number(data.phase_id) === 9 ? '<p class="test-guide-note">Para validar com usuário teste, execute a consulta do Grupo 01.</p>' : ''}
  </div>
  <div class="test-answer-list">
    <article class="test-sql-item">
      <strong>PERGUNTA CONCEITUAL</strong>
      ${concept ? `<p>${escapeHtml(concept.question)}</p><p>Resposta correta: <b>${escapeHtml(concept.label)}</b></p>`
        : '<p>Esta fase não possui pergunta conceitual.</p>'}
    </article>
    ${data.final_protocol ? `<article class="test-sql-item"><strong>PROTOCOLO PARA LIBERAR A FASE FINAL</strong><code>${escapeHtml(data.final_protocol)}</code></article>` : ''}
    <article class="test-sql-item"><strong>CÓDIGO DE ACESSO / RESPOSTA FINAL</strong><code>${escapeHtml(data.access_code ?? '')}</code></article>
  </div>`;
}
