import { escapeHtml } from './api-client.js';

export function renderQueryResultCell(value, { linkExternal = false } = {}) {
  if (value == null) return 'NULL';

  const text = String(value);
  if (!linkExternal) return escapeHtml(text);

  let url;
  try {
    url = new URL(text);
  } catch {
    return escapeHtml(text);
  }
  if (url.protocol !== 'https:') return escapeHtml(text);

  return `<a class="external-resource-link" href="${escapeHtml(url.href)}" aria-label="Abrir recurso externo em nova aba" target="_blank" rel="noopener noreferrer"><span>${escapeHtml(text)}</span><span aria-hidden="true"> ↗</span></a>`;
}
