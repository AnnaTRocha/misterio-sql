import { escapeHtml } from './api-client.js';

const KEYWORDS = new Set(`all alter always and as asc begin between by case cast check commit constraint create cross current_date current_time current_timestamp database default delete desc distinct drop else end except exists explain foreign from full generated group having identity in index inner insert intersect into is join key left like limit natural not null offset on or order outer primary references returning right rollback row_number savepoint select set table then to transaction union unique update using values when where with`.split(/\s+/));
const TYPES = new Set(`bigint boolean char date decimal double integer numeric real serial smallint text time timestamp varchar`.split(/\s+/));
const LITERALS = new Set(['false', 'null', 'true']);
const FUNCTIONS = new Set(`avg count lower max min row_number sum upper`.split(/\s+/));
const TOKEN = /--[^\n]*|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|"(?:""|[^"])*"|\b[A-Za-z_][A-Za-z0-9_$]*\b|\b\d+(?:\.\d+)?\b|<=|>=|<>|!=|::|\|\||[-+*/%=<>(),.;]/g;

function tokenClass(token) {
  if (token.startsWith('--') || token.startsWith('/*')) return 'sql-token-comment';
  if (token.startsWith("'")) return 'sql-token-string';
  if (token.startsWith('"')) return 'sql-token-identifier';
  if (/^\d/.test(token)) return 'sql-token-number';
  if (/^[A-Za-z_]/.test(token)) {
    const normalized = token.toLowerCase();
    if (KEYWORDS.has(normalized)) return 'sql-token-keyword';
    if (TYPES.has(normalized)) return 'sql-token-type';
    if (LITERALS.has(normalized)) return 'sql-token-literal';
    if (FUNCTIONS.has(normalized)) return 'sql-token-function';
  }
  return '';
}

export function highlightSql(source) {
  const sql = String(source || '');
  let cursor = 0;
  let html = '';
  for (const match of sql.matchAll(TOKEN)) {
    const token = match[0];
    const start = match.index;
    html += escapeHtml(sql.slice(cursor, start));
    const type = tokenClass(token);
    html += type ? `<span class="${type}">${escapeHtml(token)}</span>` : escapeHtml(token);
    cursor = start + token.length;
  }
  html += escapeHtml(sql.slice(cursor));
  return `${html}\n`;
}

export function bindSqlHighlight(editor, codeElement) {
  const render = () => {
    codeElement.innerHTML = highlightSql(editor.value);
    codeElement.style.transform = `translate(${-editor.scrollLeft}px, ${-editor.scrollTop}px)`;
  };
  editor.addEventListener('input', render);
  editor.addEventListener('scroll', render);
  render();
  return render;
}
