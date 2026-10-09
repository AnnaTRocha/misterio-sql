import test from 'node:test';
import assert from 'node:assert/strict';
import { sqlToExecute } from '../js/sql-selection.js';

test('executa somente o trecho SQL selecionado', () => {
  const value = 'SELECT * FROM usuarios;\nSELECT * FROM mensagens;';
  assert.equal(sqlToExecute({ value, selectionStart: 24, selectionEnd: value.length }), 'SELECT * FROM mensagens;');
});

test('sem seleção, executa o conteúdo completo do editor', () => {
  const value = '  SELECT * FROM usuarios;  ';
  assert.equal(sqlToExecute({ value, selectionStart: 8, selectionEnd: 8 }), 'SELECT * FROM usuarios;');
});
