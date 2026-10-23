import test from 'node:test';
import assert from 'node:assert/strict';
import { renderQueryResultCell } from '../js/query-result-cell.js';

test('resultado externo mantém a URL inteira visível e clicável', () => {
  const address = 'https://example.test/image.png?name=stars&size=large';
  const cell = renderQueryResultCell(address, { linkExternal: true });

  assert.ok(cell.includes(`<span>${address.replaceAll('&', '&amp;')}</span><span aria-hidden="true"> ↗</span></a>`));
  assert.ok(cell.includes(`href="${address.replaceAll('&', '&amp;')}"`));
  assert.ok(cell.includes('target="_blank"'));
  assert.ok(cell.includes('rel="noopener noreferrer"'));
  assert.ok(cell.includes('aria-label="Abrir recurso externo em nova aba"'));
  assert.ok(!cell.includes('title="Abrir recurso externo"'));
});

test('valores que não são HTTPS são mostrados como texto escapado', () => {
  assert.equal(renderQueryResultCell('http://example.test'), 'http://example.test');
  assert.equal(renderQueryResultCell('<script>alert(1)</script>', { linkExternal: true }), '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.equal(renderQueryResultCell('https://example.test'), 'https://example.test');
  assert.equal(renderQueryResultCell(null, { linkExternal: true }), 'NULL');
});
