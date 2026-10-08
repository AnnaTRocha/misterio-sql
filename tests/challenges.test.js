import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateChallenge, LESSONS } from '../server/challenges.js';

const solutions = {
  3: [
    'CREATE TABLE setores(id INTEGER PRIMARY KEY,nome TEXT NOT NULL)',
    'CREATE TABLE observacoes(id INTEGER PRIMARY KEY,setor_id INTEGER,FOREIGN KEY(setor_id) REFERENCES setores(id))'
  ],
  4: [
    'ALTER TABLE objetos_celestes ADD COLUMN origem TEXT',
    'CREATE TABLE observadores(id INTEGER PRIMARY KEY,nome TEXT,telefone TEXT UNIQUE)'
  ],
  5: [
    'BEGIN',
    "INSERT INTO simbolos VALUES(3,'PLEIADES',6,'confirmado')",
    "UPDATE simbolos SET status='confirmado' WHERE nome='SUBARU'",
    "DELETE FROM simbolos WHERE nome='MARCA FALSA'",
    'COMMIT'
  ],
  6: [
    "SELECT nome FROM objetos_celestes WHERE ano=1987 AND setor='N-04'",
    'SELECT DISTINCT setor FROM objetos_celestes',
    'SELECT ano, COUNT(*) FROM objetos_celestes GROUP BY ano ORDER BY COUNT(*) DESC'
  ],
  7: [
    "SELECT o.nome FROM acessos_celestes a JOIN objetos_celestes o ON a.objeto_id=o.id WHERE a.ano=1987 AND a.status='valido'",
    'SELECT o.nome FROM objetos_celestes o LEFT JOIN acessos_celestes a ON a.objeto_id=o.id WHERE a.id IS NULL',
    'SELECT o.nome,COUNT(*) FROM acessos_celestes a JOIN objetos_celestes o ON a.objeto_id=o.id GROUP BY o.nome'
  ],
  8: [
    'SELECT usuario FROM acessos_celestes WHERE objeto_id IN (SELECT id FROM objetos_celestes WHERE ano=1987)',
    'WITH equipes AS (SELECT equipe,COUNT(*) AS total FROM investigacoes GROUP BY equipe) SELECT * FROM equipes',
    'SELECT equipe,apelido,ROW_NUMBER() OVER(PARTITION BY equipe ORDER BY id) FROM investigacoes'
  ],
  9: [
    'SELECT s.grupo,s.usuario,d.usuario,i.usuario,i.codigo FROM sessoes_arg s JOIN dispositivos_arg d ON s.sessao=d.sessao AND s.grupo=d.grupo JOIN identidades_arg i ON d.dispositivo=i.dispositivo AND d.grupo=i.grupo WHERE s.grupo=1'
  ]
};

for (const [phase, queries] of Object.entries(solutions)) {
  test(`aula ${phase}: todos os requisitos dependem das consultas`, async () => {
    const id = Number(phase);
    const empty = await evaluateChallenge(id, [], 1);
    assert.deepEqual(empty.milestones, []);
    const result = await evaluateChallenge(id, queries, 1, id === 9);
    assert.deepEqual(new Set(result.milestones), new Set(LESSONS[id].objectives.map(([key]) => key)));
  });
}

test('restrições e pistas não são aceitas por presença de palavras', async () => {
  const ddl = await evaluateChallenge(3, ['CREATE TABLE setores(id INTEGER,nome TEXT)'], 1);
  assert.deepEqual(ddl.milestones, []);
  const transaction = await evaluateChallenge(5, ['BEGIN', 'COMMIT'], 1);
  assert.ok(!transaction.milestones.includes('transaction'));
  const direct = await evaluateChallenge(9, ['SELECT codigo FROM identidades_arg'], 1, false);
  assert.ok(!direct.milestones.includes('secret'));
  assert.ok(!direct.milestones.includes('nosql'));
});
