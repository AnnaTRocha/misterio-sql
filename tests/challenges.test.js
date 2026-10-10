import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateChallenge, executeArchiveQuery, LESSONS } from '../server/challenges.js';
import { queryMilestones } from '../api/game.js';
import { CONCEPTS, publicConcept } from '../server/concepts.js';
import { expectedSqlForPhase } from '../server/test-tools.js';

const solutions = {
  3: [
    'SELECT * FROM evidencias',
    'SELECT * FROM evidencias e JOIN referencias r ON r.evidencia_id=e.id',
    'SELECT * FROM referencias r JOIN recursos rc ON rc.id=r.recurso_id',
    "SELECT rc.endereco FROM referencias r JOIN recursos rc ON rc.id=r.recurso_id WHERE rc.status='recuperado'",
    'SELECT * FROM evidencias e LEFT JOIN referencias r ON r.evidencia_id=e.id WHERE r.id IS NULL'
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

test('aula 3: objetivos e consultas de referência descrevem a mesma tarefa', () => {
  assert.deepEqual(expectedSqlForPhase(3).map(item => item.objective), LESSONS[3].objectives.map(([, label]) => label));
});

test('aula 3: aceita aliases, ordem invertida, projeções e filtros equivalentes', async () => {
  const queries = [
    "select codigo from evidencias where codigo = 'SEIS-ESTRELAS'",
    "SELECT e.codigo FROM referencias AS r INNER JOIN evidencias AS e ON e.id = r.evidencia_id WHERE e.codigo = 'SEIS-ESTRELAS'",
    "SELECT rc.endereco FROM recursos AS rc INNER JOIN referencias AS r ON r.recurso_id = rc.id WHERE rc.status = 'recuperado'",
    "SELECT endereco FROM recursos WHERE id = 7",
    'SELECT e.codigo FROM evidencias AS e LEFT OUTER JOIN referencias AS r ON e.id = r.evidencia_id WHERE r.evidencia_id IS NULL'
  ];
  const result = await evaluateChallenge(3, queries, 1);
  assert.deepEqual(new Set(result.milestones), new Set(LESSONS[3].objectives.map(([key]) => key)));
  const withoutAliases = await evaluateChallenge(3, [
    'SELECT evidencias.codigo FROM evidencias JOIN referencias ON (evidencias.id) = (referencias.evidencia_id)'
  ], 1);
  assert.ok(withoutAliases.milestones.includes('evidence_join'));
  const commaJoin = await evaluateChallenge(3, [
    'SELECT e.codigo FROM evidencias e, referencias r WHERE e.id = r.evidencia_id'
  ], 1);
  assert.ok(commaJoin.milestones.includes('evidence_join'));
});

test('aula 3: relações incorretas ou resultados não isolados não completam objetivos', async () => {
  const wrongJoin = await evaluateChallenge(3, ['SELECT * FROM evidencias e JOIN referencias r ON e.id = r.id'], 1);
  assert.ok(!wrongJoin.milestones.includes('evidence_join'));
  const unfilteredResources = await evaluateChallenge(3, ['SELECT * FROM recursos'], 1);
  assert.ok(!unfilteredResources.milestones.includes('resource_found'));
  const allEvidences = await evaluateChallenge(3, ['SELECT * FROM evidencias e LEFT JOIN referencias r ON e.id = r.evidencia_id'], 1);
  assert.ok(!allEvidences.milestones.includes('orphans'));
});

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
  const empty = await evaluateChallenge(3, ['SELECT * FROM evidencias WHERE 1=0'], 1);
  assert.deepEqual(empty.milestones, []);
  const ddl = await evaluateChallenge(3, ['CREATE TABLE setores(id INTEGER,nome TEXT)'], 1);
  assert.deepEqual(ddl.milestones, []);
  const transaction = await evaluateChallenge(5, ['BEGIN', 'COMMIT'], 1);
  assert.ok(!transaction.milestones.includes('transaction'));
  const direct = await evaluateChallenge(9, ['SELECT codigo FROM identidades_arg'], 1, false);
  assert.ok(!direct.milestones.includes('secret'));
  assert.ok(!direct.milestones.includes('nosql'));
});

test('consultas de referência das primeiras aulas produzem evidência real', async () => {
  for (const phase of [1, 2]) {
    const found = new Set();
    for (const item of expectedSqlForPhase(phase)) {
      const result = await executeArchiveQuery(item.sql);
      queryMilestones(phase, item.sql, result).forEach(key => found.add(key));
    }
    if (phase === 1) assert.deepEqual(found, new Set(['users', 'projection', 'messages']));
    else assert.deepEqual(found, new Set(['witness', 'missing', 'cities', 'last_access', 'frequency', 'window', 'identify', 'code']));
  }
});

test('etapa 2.6 usa uma consulta e mantém válidas as consultas antigas', async () => {
  const guide = expectedSqlForPhase(2);
  assert.equal(guide.filter(item => item.step.startsWith('2.6')).length, 1);
  const combined = guide.at(-1).sql;
  assert.deepEqual(new Set(queryMilestones(2, combined, await executeArchiveQuery(combined))), new Set(['window', 'identify', 'code']));
  const oldCount = "SELECT usuario_id, COUNT(*) AS acessos FROM acessos WHERE data BETWEEN '1987-09-17' AND '1987-09-21' GROUP BY usuario_id ORDER BY acessos DESC;";
  const oldUser = 'SELECT * FROM usuarios WHERE id = 37;';
  assert.ok(queryMilestones(2, oldCount, await executeArchiveQuery(oldCount)).includes('window'));
  assert.ok(queryMilestones(2, oldUser, await executeArchiveQuery(oldUser)).includes('identify'));
});

test('consulta vazia não valida descoberta só por conter palavras-chave', async () => {
  const emptyUsers = 'SELECT * FROM usuarios WHERE 1=0';
  const emptyMessages = 'SELECT * FROM mensagens WHERE remetente_id=3 AND 1=0';
  assert.deepEqual(queryMilestones(1, emptyUsers, await executeArchiveQuery(emptyUsers)), []);
  assert.deepEqual(queryMilestones(1, emptyMessages, await executeArchiveQuery(emptyMessages)), []);
});

test('cada aula tem uma pergunta pública sem a chave de resposta', () => {
  for (let phase = 1; phase <= 9; phase++) {
    if (phase === 3) {
      assert.equal(publicConcept(phase), null);
      continue;
    }
    const question = publicConcept(phase);
    assert.ok(question?.prompt);
    assert.equal(question.options.length, 3);
    assert.ok(question.options.some(([value]) => value === CONCEPTS[phase].answer));
    assert.ok(!Object.hasOwn(question, 'answer'));
  }
});
