import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUsername, validUsername } from '../server/auth.js';

test('nome de usuário aceita acentos, espaços e identificadores antigos', () => {
  assert.equal(normalizeUsername('  João   da Silva  '), 'João da Silva');
  for (const name of ['João da Silva', 'ana.silva_2', 'aluno-03']) {
    assert.equal(validUsername(name), true, name);
  }
});

test('nome de usuário rejeita tamanho inválido e caracteres não anunciados', () => {
  for (const name of ['ab', 'a'.repeat(31), 'ana@email.com', '---']) {
    assert.equal(validUsername(name), false, name);
  }
});
