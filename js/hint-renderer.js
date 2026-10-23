import { escapeHtml } from './api-client.js';

export function renderHint(hint) {
  if (typeof hint === 'string') return escapeHtml(hint);
  const text = escapeHtml(hint?.text || 'Pista indisponível.');
  const link = hint?.link;
  if (!link?.url || !link?.label) return text;
  try {
    const url = new URL(link.url);
    if (url.protocol !== 'https:') return text;
    return `${text}<br><a class="external-resource-link" href="${escapeHtml(url.href)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(link.label)} (abre em nova aba)">${escapeHtml(link.label)} ↗</a>`;
  } catch {
    return text;
  }
}
