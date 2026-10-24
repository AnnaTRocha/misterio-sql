import test from 'node:test';
import assert from 'node:assert/strict';
import { createEvidenceSnapshot } from '../js/evidence-notebook.js';

test('o caderno salva apenas resultados tabulares visíveis e limita seu tamanho', () => {
  const rows = Array.from({ length: 8 }, (_, index) => [index, `linha-${index}`, '<script>']);
  const snapshot = createEvidenceSnapshot(' SELECT * FROM evidencias; ', [{
    columns: ['id', 'descricao', 'html'],
    values: rows
  }]);
  assert.equal(snapshot.query, 'SELECT * FROM evidencias;');
  assert.equal(snapshot.results[0].values.length, 4);
  assert.equal(snapshot.results[0].values[0][2], '<script>');
  assert.equal(createEvidenceSnapshot('CREATE TABLE t (id INTEGER)', []), null);
});

test('o caderno restringe colunas, células e tamanho de texto', () => {
  const snapshot = createEvidenceSnapshot('x'.repeat(1000), [{
    columns: Array.from({ length: 9 }, (_, index) => `c${index}`),
    values: [Array.from({ length: 9 }, (_, index) => `${index}`.repeat(200))]
  }]);
  assert.equal(snapshot.query.length, 800);
  assert.equal(snapshot.results[0].columns.length, 6);
  assert.equal(snapshot.results[0].values[0].length, 6);
  assert.equal(snapshot.results[0].values[0][0].length, 160);
});
