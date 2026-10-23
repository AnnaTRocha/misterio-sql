import test from 'node:test';
import assert from 'node:assert/strict';
import { renderHint } from '../js/hint-renderer.js';

test('pistas tradicionais continuam como texto escapado', () => {
  assert.equal(renderHint('<script>'), '&lt;script&gt;');
});

test('pista externa mantém link HTTPS seguro e com nome acessível', () => {
  const html = renderHint({
    text: 'Consulte a referência.',
    link: { label: 'Documentação oficial', url: 'https://example.test/docs?x=1&y=2' }
  });
  assert.ok(html.includes('Consulte a referência.'));
  assert.ok(html.includes('href="https://example.test/docs?x=1&amp;y=2"'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
  assert.ok(html.includes('target="_blank"'));
  assert.ok(!renderHint({ text: 'Pista', link: { label: 'Inseguro', url: 'javascript:alert(1)' } }).includes('<a '));
});
