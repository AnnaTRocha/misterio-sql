import test from 'node:test';
import assert from 'node:assert/strict';
import { QUESTIONS, gradeAssessment, previewMarketplace } from '../server/marketplace-assessment.js';

test('consultas de referência e variações corretas recebem nota integral', async () => {
  const answers = QUESTIONS.map(q => q[1]);
  answers[0] = 'SELECT nome AS cliente, cidade AS localidade FROM clientes ORDER BY nome DESC';
  answers[8] = 'SELECT nome FROM clientes WHERE id_cliente NOT IN (SELECT id_cliente FROM pedidos)';
  const result = await gradeAssessment(answers);
  assert.equal(result.score, 100);
  assert.ok(result.correct.every(Boolean));
});

test('respostas vazias, erradas, com ordem incorreta e comandos de escrita são rejeitados', async () => {
  const answers = QUESTIONS.map(q => q[1]);
  answers[0] = '';
  answers[1] = 'SELECT categoria FROM produtos';
  answers[4] = 'SELECT nome, preco FROM produtos ORDER BY preco ASC';
  answers[5] = 'DELETE FROM pedidos';
  const result = await gradeAssessment(answers);
  assert.deepEqual([result.correct[0], result.correct[1], result.correct[4], result.correct[5]], [false, false, false, false]);
  assert.equal(result.correct.filter(Boolean).length, 8);
  await assert.rejects(previewMarketplace('DELETE FROM pedidos'));
  await assert.rejects(previewMarketplace('SELECT * FROM clientes; DELETE FROM clientes'));
  assert.equal((await previewMarketplace('SELECT * FROM clientes'))[0].values.length, 5);
});
