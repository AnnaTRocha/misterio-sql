import { escapeHtml } from './api-client.js';

export function renderSchema(table, columns) {
  if (!columns?.length) {
    return `<div class="empty-result"><span>!</span><p>A tabela “${escapeHtml(table)}” ainda não existe nesta cópia, ou não contém colunas.</p></div>`;
  }

  const rows = columns.map(column => {
    const keys = [];
    if (column.primary_key) keys.push('PK');
    if (column.foreign_key) keys.push(`FK → ${column.foreign_key.table}.${column.foreign_key.column}`);
    return `<tr><td>${escapeHtml(column.name)}</td><td>${escapeHtml(column.type || '—')}</td><td>${column.nullable ? 'Sim' : 'Não'}</td><td>${escapeHtml(keys.join(' · ') || '—')}</td></tr>`;
  }).join('');

  return `<div class="query-meta">Estrutura de ${escapeHtml(table)}</div><table class="result-table schema-table"><thead><tr><th>Coluna</th><th>Tipo</th><th>Aceita NULL</th><th>Chave</th></tr></thead><tbody>${rows}</tbody></table>`;
}
