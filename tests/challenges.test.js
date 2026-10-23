import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedStatement, evaluateChallenge, executeArchiveQuery, LESSONS } from '../server/challenges.js';
import { queryMilestones } from '../api/game.js';
import { CONCEPTS, publicConcept } from '../server/concepts.js';
import { expectedSqlForPhase } from '../server/test-tools.js';

const solutions = {
  3: [
    'SELECT * FROM evidencias',
    'SELECT * FROM evidencias e JOIN referencias r ON r.evidencia_id=e.evidencia_id',
    'SELECT * FROM referencias r JOIN recursos rc ON rc.recurso_id=r.recurso_id',
    "SELECT rc.endereco FROM referencias r JOIN recursos rc ON rc.recurso_id=r.recurso_id WHERE rc.status='recuperado'",
    'SELECT * FROM evidencias e LEFT JOIN referencias r ON r.evidencia_id=e.evidencia_id WHERE r.referencia_id IS NULL'
  ],
  4: expectedSqlForPhase(4).map(item => item.sql),
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
    "SELECT o.nome,o.setor FROM acessos_celestes a JOIN objetos_celestes o ON a.id_objeto_celeste=o.id_objeto_celeste WHERE a.ano=1987 AND a.status='valido'",
    'SELECT o.nome FROM objetos_celestes o LEFT JOIN acessos_celestes a ON a.id_objeto_celeste=o.id_objeto_celeste WHERE a.id_acesso_celeste IS NULL',
    'SELECT o.nome,COUNT(*) FROM acessos_celestes a JOIN objetos_celestes o ON a.id_objeto_celeste=o.id_objeto_celeste GROUP BY o.nome'
  ],
  8: [
    'SELECT usuario FROM acessos_celestes WHERE id_objeto_celeste IN (SELECT id_objeto_celeste FROM objetos_celestes WHERE ano=1987)',
    'WITH equipes AS (SELECT equipe,COUNT(*) AS total FROM investigacoes GROUP BY equipe) SELECT * FROM equipes',
    'SELECT equipe,apelido,ROW_NUMBER() OVER(PARTITION BY equipe ORDER BY id) FROM investigacoes'
  ],
  9: [
    'SELECT s.grupo,s.usuario,d.usuario,i.usuario,i.codigo FROM sessoes_arg s JOIN dispositivos_arg d ON s.sessao=d.sessao AND s.grupo=d.grupo JOIN identidades_arg i ON d.dispositivo=i.dispositivo AND d.grupo=i.grupo WHERE s.grupo=1'
  ]
};

test('aula 3: cada consulta de referência conclui o objetivo correspondente', async () => {
  const guide = expectedSqlForPhase(3);
  assert.deepEqual(guide.map(item => item.objective), LESSONS[3].objectives.map(([, label]) => label));
  for (const [index, item] of guide.entries()) {
    const result = await evaluateChallenge(3, [item.sql], 1);
    assert.ok(result.milestones.includes(LESSONS[3].objectives[index][0]), item.step);
  }
});

test('aula 3: as chaves das três tabelas têm nomes distintos e claros', async () => {
  for (const [table, expected] of [
    ['evidencias', ['evidencia_id', 'codigo', 'descricao']],
    ['referencias', ['referencia_id', 'evidencia_id', 'recurso_id']],
    ['recursos', ['recurso_id', 'tipo', 'endereco', 'status']]
  ]) {
    const result = await evaluateChallenge(3, [`PRAGMA table_info(${table})`], 1);
    assert.deepEqual(result.result[0].values.map(row => row[1]), expected);
  }
});

test('aula 3: aceita aliases, ordem invertida, projeções e filtros equivalentes', async () => {
  const queries = [
    "select codigo from evidencias where codigo = 'SEIS-ESTRELAS'",
    "SELECT e.codigo FROM referencias AS r INNER JOIN evidencias AS e ON e.evidencia_id = r.evidencia_id WHERE e.codigo = 'SEIS-ESTRELAS'",
    "SELECT rc.endereco FROM recursos AS rc INNER JOIN referencias AS r ON r.recurso_id = rc.recurso_id WHERE rc.status = 'recuperado'",
    "SELECT endereco FROM recursos WHERE recurso_id = 7",
    'SELECT e.codigo FROM evidencias AS e LEFT OUTER JOIN referencias AS r ON e.evidencia_id = r.evidencia_id WHERE r.evidencia_id IS NULL'
  ];
  const result = await evaluateChallenge(3, queries, 1);
  assert.deepEqual(new Set(result.milestones), new Set(LESSONS[3].objectives.map(([key]) => key)));
  const withoutAliases = await evaluateChallenge(3, [
    'SELECT evidencias.codigo FROM evidencias JOIN referencias ON (evidencias.evidencia_id) = (referencias.evidencia_id)'
  ], 1);
  assert.ok(withoutAliases.milestones.includes('evidence_join'));
  const commaJoin = await evaluateChallenge(3, [
    'SELECT e.codigo FROM evidencias e, referencias r WHERE e.evidencia_id = r.evidencia_id'
  ], 1);
  assert.ok(commaJoin.milestones.includes('evidence_join'));
});

test('aula 3: relações incorretas ou resultados não isolados não completam objetivos', async () => {
  const oldColumn = await evaluateChallenge(3, ['SELECT * FROM evidencias JOIN referencias r ON r.id = evidencia_id'], 1);
  assert.equal(oldColumn.lastSucceeded, false);
  const wrongJoin = await evaluateChallenge(3, ['SELECT * FROM evidencias e JOIN referencias r ON e.evidencia_id = r.referencia_id'], 1);
  assert.ok(!wrongJoin.milestones.includes('evidence_join'));
  const unfilteredResources = await evaluateChallenge(3, ['SELECT * FROM recursos'], 1);
  assert.ok(!unfilteredResources.milestones.includes('resource_found'));
  const allEvidences = await evaluateChallenge(3, ['SELECT * FROM evidencias e LEFT JOIN referencias r ON e.evidencia_id = r.evidencia_id'], 1);
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

test('aula 4: aceita sintaxes equivalentes que preservam os dados e as relações', async () => {
  const queries = [
    "ALTER TABLE objetos_celestes ADD origem_objeto_celeste TEXT NOT NULL DEFAULT 'sem origem'",
    `CREATE TABLE observadores (
      nome_observador TEXT NOT NULL,
      telefone_observador TEXT NOT NULL,
      id_observador INTEGER NOT NULL,
      CONSTRAINT pk_contatos PRIMARY KEY (id_observador),
      CONSTRAINT uq_telefone UNIQUE (telefone_observador)
    )`,
    `CREATE TABLE observacoes_catalogo (
      id_observacao_catalogo INTEGER PRIMARY KEY,
      id_objeto_celeste INTEGER NOT NULL REFERENCES objetos_celestes(id_objeto_celeste),
      id_observador INTEGER NOT NULL REFERENCES observadores(id_observador),
      nome_observatorio TEXT NOT NULL,
      UNIQUE (nome_observatorio, id_observador, id_objeto_celeste)
    )`,
    'INSERT OR IGNORE INTO observadores (telefone_observador, nome_observador) SELECT telefone_observador, nome_observador FROM catalogo_bruto GROUP BY telefone_observador, nome_observador',
    `INSERT OR IGNORE INTO observacoes_catalogo (nome_observatorio, id_objeto_celeste, id_observador)
      SELECT c.nome_observatorio, o.id_objeto_celeste, ob.id_observador
      FROM catalogo_bruto c
      INNER JOIN objetos_celestes o ON o.nome = c.nome_objeto_celeste
      INNER JOIN observadores ob ON ob.telefone_observador = c.telefone_observador
        AND ob.nome_observador = c.nome_observador`
  ];
  const result = await evaluateChallenge(4, queries, 1);
  assert.equal(result.lastSucceeded, true);
  assert.deepEqual(new Set(result.milestones), new Set(LESSONS[4].objectives.map(([key]) => key)));
});

test('aula 4: rejeita esquemas que não respeitam a nomenclatura ou as relações', async () => {
  const wrongPrimaryKey = await evaluateChallenge(4, [
    'CREATE TABLE observadores (id INTEGER PRIMARY KEY, nome TEXT, telefone TEXT UNIQUE)'
  ], 1);
  assert.ok(!wrongPrimaryKey.milestones.includes('observadores'));
  assert.ok(!wrongPrimaryKey.milestones.includes('unico'));

  const wrongForeignKey = await evaluateChallenge(4, [
    'CREATE TABLE observadores (id_observador INTEGER PRIMARY KEY, nome_observador TEXT NOT NULL, telefone_observador TEXT NOT NULL UNIQUE)',
    'CREATE TABLE observacoes_catalogo (id_observacao_catalogo INTEGER PRIMARY KEY, id_objeto_celeste INTEGER NOT NULL REFERENCES objetos_celestes(nome), id_observador INTEGER NOT NULL REFERENCES observadores(id_observador), nome_observatorio TEXT NOT NULL, UNIQUE(id_objeto_celeste,id_observador,nome_observatorio))'
  ], 1);
  assert.ok(!wrongForeignKey.milestones.includes('relacoes'));
});

test('aula 4: migra todos os registros e mantém a trilha idempotente', async () => {
  const queries = expectedSqlForPhase(4).map(item => item.sql);
  const result = await evaluateChallenge(4, [...queries, ...queries], 1);
  assert.equal(result.lastSucceeded, true);
  assert.deepEqual(new Set(result.milestones), new Set(LESSONS[4].objectives.map(([key]) => key)));
});

test('aula 4: não conclui a migração quando faltam observações e protege a fonte', async () => {
  const queries = expectedSqlForPhase(4).map(item => item.sql);
  queries[5] = queries[5].replace(/;$/, " WHERE c.nome_objeto_celeste = 'ORION'");

  const result = await evaluateChallenge(4, queries, 1);
  assert.ok(result.milestones.includes('migrar_observadores'));
  assert.ok(!result.milestones.includes('migrar_observacoes'));
  assert.equal(allowedStatement(4, "INSERT INTO catalogo_bruto VALUES (4,'VEGA','LIA','4801','NORTE')"), false);
  assert.equal(allowedStatement(4, 'DELETE FROM catalogo_bruto'), false);
});

test('aula 4: o guia de validação acompanha os objetivos publicados', () => {
  const guide = expectedSqlForPhase(4);
  assert.deepEqual(guide.map(item => item.step), ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6']);
  assert.deepEqual(guide.map(item => item.objective), LESSONS[4].objectives.map(([, label]) => label));
});

test('aula 5 e aula 6: perguntas finais e objetivo do filtro usam referências claras', () => {
  assert.match(LESSONS[5].answerPrompt, /aglomerado de seis estrelas inserido e confirmado/i);
  assert.doesNotMatch(LESSONS[5].answerPrompt, /PLEIADES/i);
  assert.match(LESSONS[6].objectives[0][1], /registro ORION/i);
  assert.doesNotMatch(LESSONS[6].objectives[0][1], /primeiro registro/i);
});

test('aula 5: a consulta de estrutura funciona sem liberar outros PRAGMA', async () => {
  assert.equal(allowedStatement(5, 'PRAGMA table_info(simbolos);'), true);
  assert.equal(allowedStatement(5, 'PRAGMA table_info(usuarios);'), false);
  assert.equal(allowedStatement(5, 'PRAGMA foreign_keys = OFF;'), false);

  const structure = await evaluateChallenge(5, ['PRAGMA table_info(simbolos)'], 1);
  assert.equal(structure.lastSucceeded, true);
  assert.ok(structure.result[0]?.values.length > 0);
});

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
