import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedStatement, evaluateChallenge, executeArchiveQuery, inspectArchiveSchema, LESSONS } from '../server/challenges.js';
import { queryMilestones } from '../api/game.js';
import { CONCEPTS, publicConcept } from '../server/concepts.js';
import { expectedSqlForPhase } from '../server/test-tools.js';

const solutions = {
  3: [
    'SELECT * FROM evidencias',
    'SELECT * FROM evidencias e JOIN referencias r ON r.evidencia_id=e.id_evidencia',
    'SELECT * FROM referencias r JOIN recursos rc ON rc.id_recurso=r.recurso_id',
    "SELECT rc.endereco FROM referencias r JOIN recursos rc ON rc.id_recurso=r.recurso_id WHERE rc.status='recuperado'",
    'SELECT * FROM evidencias e LEFT JOIN referencias r ON r.evidencia_id=e.id_evidencia WHERE r.id_referencia IS NULL'
  ],
  4: expectedSqlForPhase(4).map(item => item.sql),
  5: [
    'BEGIN',
    "INSERT INTO simbolos (nome,estrelas,status) VALUES('PLEIADES',6,'confirmado')",
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
    'SELECT equipe,apelido,ROW_NUMBER() OVER(PARTITION BY equipe ORDER BY id_investigacao) FROM investigacoes'
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

test('aula 3: as PKs usam id_ e as FKs apontam para as chaves correspondentes', async () => {
  for (const [table, expected] of [
    ['evidencias', ['id_evidencia', 'codigo', 'descricao']],
    ['referencias', ['id_referencia', 'evidencia_id', 'recurso_id']],
    ['recursos', ['id_recurso', 'tipo', 'endereco', 'status']]
  ]) {
    const result = await evaluateChallenge(3, [], 1, false, { inspectTable: table });
    assert.deepEqual(result.schema.map(column => column.name), expected);
    assert.deepEqual(result.schema.filter(column => column.primary_key).map(column => column.name), [expected[0]]);
  }

  const foreignKeys = await evaluateChallenge(3, [], 1, false, { inspectTable: 'referencias' });
  assert.deepEqual(new Set(foreignKeys.schema.filter(column => column.foreign_key).map(column => `${column.foreign_key.table}.${column.name}=${column.foreign_key.column}`)), new Set([
    'evidencias.evidencia_id=id_evidencia',
    'recursos.recurso_id=id_recurso'
  ]));

  const legacyPrimaryKey = await evaluateChallenge(3, ['SELECT evidencia_id FROM evidencias'], 1);
  assert.equal(legacyPrimaryKey.lastSucceeded, false);
});

test('aulas 1, 2 e 5: as chaves primárias seguem id_<singular>', async () => {
  for (const [table, key] of [
    ['usuarios', 'id_usuario'],
    ['pessoas', 'id_pessoa'],
    ['acessos', 'id_acesso'],
    ['mensagens', 'id_mensagem'],
    ['arquivos', 'id_arquivo']
  ]) {
    const result = await executeArchiveQuery(`PRAGMA table_info(${table})`);
    const columns = result[0].values;
    assert.deepEqual(columns.filter(row => row[5] === 1).map(row => row[1]), [key]);
    assert.ok(!columns.some(row => row[1] === 'id'));
  }

  const accessForeignKeys = await executeArchiveQuery('PRAGMA foreign_key_list(acessos)');
  assert.deepEqual(new Set(accessForeignKeys[0].values.map(row => `${row[2]}.${row[3]}=${row[4]}`)), new Set([
    'pessoas.pessoa_id=id_pessoa',
    'usuarios.usuario_id=id_usuario'
  ]));
  const messageForeignKeys = await executeArchiveQuery('PRAGMA foreign_key_list(mensagens)');
  assert.deepEqual(messageForeignKeys[0].values.map(row => `${row[2]}.${row[3]}=${row[4]}`), [
    'usuarios.remetente_id=id_usuario'
  ]);

  const userProjection = await executeArchiveQuery(expectedSqlForPhase(1)[1].sql);
  assert.deepEqual(userProjection[0].columns, ['id_usuario', 'nome']);
  await assert.rejects(executeArchiveQuery('SELECT id, nome FROM usuarios'));

  const symbols = await evaluateChallenge(5, [], 1, false, { inspectTable: 'simbolos' });
  assert.deepEqual(symbols.schema.filter(column => column.primary_key).map(column => column.name), ['id_simbolo']);
  assert.ok(!symbols.schema.some(column => column.name === 'id'));
});

test('aula 3: aceita aliases, ordem invertida, projeções e filtros equivalentes', async () => {
  const queries = [
    "select codigo from evidencias where codigo = 'SEIS-ESTRELAS'",
    "SELECT e.codigo FROM referencias AS r INNER JOIN evidencias AS e ON e.id_evidencia = r.evidencia_id WHERE e.codigo = 'SEIS-ESTRELAS'",
    "SELECT rc.endereco FROM recursos AS rc INNER JOIN referencias AS r ON rc.id_recurso = r.recurso_id WHERE rc.status = 'recuperado'",
    "SELECT endereco FROM recursos WHERE id_recurso = 7",
    'SELECT e.codigo FROM evidencias AS e LEFT OUTER JOIN referencias AS r ON e.id_evidencia = r.evidencia_id WHERE r.evidencia_id IS NULL'
  ];
  const result = await evaluateChallenge(3, queries, 1);
  assert.deepEqual(new Set(result.milestones), new Set(LESSONS[3].objectives.map(([key]) => key)));
  const withoutAliases = await evaluateChallenge(3, [
    'SELECT evidencias.codigo FROM evidencias JOIN referencias ON (evidencias.id_evidencia) = (referencias.evidencia_id)'
  ], 1);
  assert.ok(withoutAliases.milestones.includes('evidence_join'));
  const commaJoin = await evaluateChallenge(3, [
    'SELECT e.codigo FROM evidencias e, referencias r WHERE e.id_evidencia = r.evidencia_id'
  ], 1);
  assert.ok(commaJoin.milestones.includes('evidence_join'));
});

test('aula 3: relações incorretas ou resultados não isolados não completam objetivos', async () => {
  const oldColumn = await evaluateChallenge(3, ['SELECT * FROM evidencias JOIN referencias r ON r.id = evidencia_id'], 1);
  assert.equal(oldColumn.lastSucceeded, false);
  const wrongJoin = await evaluateChallenge(3, ['SELECT * FROM evidencias e JOIN referencias r ON e.id_evidencia = r.id_referencia'], 1);
  assert.ok(!wrongJoin.milestones.includes('evidence_join'));
  const unfilteredResources = await evaluateChallenge(3, ['SELECT * FROM recursos'], 1);
  assert.ok(!unfilteredResources.milestones.includes('resource_found'));
  const allEvidences = await evaluateChallenge(3, ['SELECT * FROM evidencias e LEFT JOIN referencias r ON e.id_evidencia = r.evidencia_id'], 1);
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
      id_observador INTEGER GENERATED BY DEFAULT AS IDENTITY CONSTRAINT pk_contatos PRIMARY KEY,
      CONSTRAINT uq_telefone UNIQUE (telefone_observador)
    )`,
    `CREATE TABLE observacoes_catalogo (
      id_observacao_catalogo INTEGER GENERATED BY DEFAULT AS IDENTITY,
      id_objeto_celeste INTEGER NOT NULL REFERENCES objetos_celestes(id_objeto_celeste),
      id_observador INTEGER NOT NULL REFERENCES observadores(id_observador),
      nome_observatorio TEXT NOT NULL,
      UNIQUE (nome_observatorio, id_observador, id_objeto_celeste),
      CONSTRAINT pk_observacoes_catalogo PRIMARY KEY (id_observacao_catalogo)
    )`,
    'INSERT INTO observadores (telefone_observador, nome_observador) SELECT telefone_observador, nome_observador FROM registros_catalogo_bruto WHERE TRUE GROUP BY telefone_observador, nome_observador ON CONFLICT (telefone_observador) DO NOTHING',
    `INSERT INTO observacoes_catalogo (nome_observatorio, id_objeto_celeste, id_observador)
      SELECT c.nome_observatorio, o.id_objeto_celeste, ob.id_observador
      FROM registros_catalogo_bruto c
      INNER JOIN objetos_celestes o ON o.nome = c.nome_objeto_celeste
      INNER JOIN observadores ob ON ob.telefone_observador = c.telefone_observador
        AND ob.nome_observador = c.nome_observador
      WHERE TRUE ON CONFLICT (id_objeto_celeste, id_observador, nome_observatorio) DO NOTHING`
  ];
  const result = await evaluateChallenge(4, queries, 1);
  assert.equal(result.lastSucceeded, true);
  assert.deepEqual(new Set(result.milestones), new Set(LESSONS[4].objectives.map(([key]) => key)));
});

test('aula 4: consultas antigas bem-sucedidas continuam compondo o histórico', async () => {
  const currentGuide = expectedSqlForPhase(4).map(item => item.sql);
  const legacyQueries = currentGuide.map(query => query
    .replace(/ INTEGER GENERATED BY DEFAULT AS IDENTITY CONSTRAINT [a-z_]+ PRIMARY KEY/gi, ' INTEGER PRIMARY KEY')
    .replace(/INSERT INTO (observadores|observacoes_catalogo)/gi, 'INSERT OR IGNORE INTO $1'));
  legacyQueries.splice(1, 0, 'PRAGMA table_info(observadores);');
  const result = await evaluateChallenge(4, legacyQueries, 1);
  assert.equal(result.lastSucceeded, true);
  assert.deepEqual(new Set(result.milestones), new Set(LESSONS[4].objectives.map(([key]) => key)));
  assert.equal(allowedStatement(4, legacyQueries[2]), false);
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
  assert.equal(allowedStatement(4, "INSERT INTO registros_catalogo_bruto VALUES (4,'VEGA','LIA','4801','NORTE')"), false);
  assert.equal(allowedStatement(4, 'DELETE FROM registros_catalogo_bruto'), false);
});

test('aula 4: o guia de validação acompanha os objetivos publicados', () => {
  const guide = expectedSqlForPhase(4);
  assert.deepEqual(guide.map(item => item.step), ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6']);
  const objectives = LESSONS[4].objectives.map(([, label]) => label);
  assert.deepEqual(guide.map(item => item.objective), objectives);
  assert.match(objectives[0], /tabela objetos_celestes.*coluna origem_objeto_celeste/i);
  assert.match(objectives[1], /tabela observadores com as colunas.*id_observador.*nome_observador.*telefone_observador/i);
  assert.match(objectives[2], /tabela observadores.*coluna telefone_observador/i);
  assert.match(objectives[3], /tabela observacoes_catalogo.*coluna id_observacao_catalogo.*chave primária.*chaves estrangeiras/i);
  assert.match(objectives[4], /tabela observadores.*colunas nome_observador e telefone_observador.*2 registros/i);
  assert.match(objectives[5], /3 registros.*tabela observacoes_catalogo.*objetos_celestes.*observadores/i);
});

test('aula 4: o exemplo de medições é independente e não contém comandos SQL', () => {
  const warmup = LESSONS[4].warmup;
  assert.equal(warmup.questions.length, 3);
  assert.deepEqual(warmup.columns, ['Sensor', 'Setor', 'Umidade', 'Horário']);
  assert.deepEqual(warmup.source, [
    ['S-A', 'JARDIM', 61, '14:00'],
    ['S-A', 'JARDIM', 63, '14:15'],
    ['S-B', 'ESTUFA', 55, '14:20']
  ]);
  const example = JSON.stringify(warmup);
  for (const name of ['registros_catalogo_bruto', 'objetos_celestes', 'observadores', 'observacoes_catalogo']) {
    assert.ok(!example.includes(name), `o aquecimento não deve repetir ${name}`);
  }
  assert.match(warmup.title, /exemplo.*medições/i);
  assert.match(warmup.intro, /compare as medições/i);
  assert.doesNotMatch(example, /\b(SELECT|CREATE TABLE|CREATE INDEX|INSERT INTO|UPDATE|DELETE|JOIN|IDENTITY|PRIMARY KEY|FOREIGN KEY|NOT NULL|UNIQUE)\b/i);
});

test('os quadros expansíveis ajudam a conferir resultados sem revelar a sequência ou as chaves da solução', () => {
  const phaseFourSpec = JSON.stringify(LESSONS[4].requirements);
  assert.deepEqual(LESSONS[4].requirements.headers, ['Parte do caso', 'Condição de sucesso']);
  assert.doesNotMatch(phaseFourSpec, /\b(id_observador|id_objeto_celeste|id_observacao_catalogo|nome_observatorio|PRIMARY KEY|FOREIGN KEY|NOT NULL|UNIQUE|IDENTITY)\b/i);

  const phaseNineSupport = JSON.stringify(LESSONS[9].requirements);
  assert.deepEqual(LESSONS[9].requirements.headers, ['Fragmento', 'Informação disponível']);
  assert.doesNotMatch(phaseNineSupport, /\b(?:grupo|sessao|dispositivo|codigo)\s*=|\.(?:grupo|sessao|dispositivo|codigo)\b/i);
  assert.match(LESSONS[9].requirements.expected, /em grupo/i);
});

test('aulas 4 e 8: o esquema usa nomes plurais e chaves identificáveis', async () => {
  assert.deepEqual(LESSONS[4].tables, ['registros_catalogo_bruto', 'objetos_celestes']);
  const rawCatalog = await evaluateChallenge(4, [], 1, false, { inspectTable: 'registros_catalogo_bruto' });
  assert.deepEqual(rawCatalog.schema.map(row => row.name), [
    'id_registro_catalogo', 'nome_objeto_celeste', 'nome_observador', 'telefone_observador', 'nome_observatorio'
  ]);
  const oldCatalog = await evaluateChallenge(4, ['SELECT * FROM catalogo_bruto'], 1);
  assert.equal(oldCatalog.lastSucceeded, false);

  const investigations = await evaluateChallenge(8, [], 1, false, { inspectTable: 'investigacoes' });
  assert.equal(investigations.schema[0].name, 'id_investigacao');
});

test('aulas 6 a 8: os marcos exigem resultados completos, não apenas palavras ou quantidades', async () => {
  const cases = [
    [6, "SELECT nome FROM objetos_celestes WHERE ano=1987 OR setor='N-04'", 'filter'],
    [6, "SELECT DISTINCT setor FROM objetos_celestes UNION ALL SELECT 'FALSO'", 'distinct'],
    [6, 'SELECT ano,COUNT(*) FROM objetos_celestes GROUP BY ano ORDER BY ano', 'aggregate'],
    [7, 'SELECT o.nome,o.setor FROM acessos_celestes a JOIN objetos_celestes o ON a.id_objeto_celeste=o.id_objeto_celeste', 'inner'],
    [7, 'SELECT o.nome FROM objetos_celestes o LEFT JOIN acessos_celestes a ON a.id_objeto_celeste=o.id_objeto_celeste WHERE a.id_acesso_celeste IS NULL OR o.nome=\'ORION\'', 'left'],
    [7, 'SELECT o.nome,COUNT(*) FROM acessos_celestes a JOIN objetos_celestes o ON a.id_objeto_celeste=o.id_objeto_celeste GROUP BY o.nome HAVING COUNT(*) > 1', 'group'],
    [8, 'SELECT usuario FROM acessos_celestes WHERE id_objeto_celeste IN (SELECT id_objeto_celeste FROM objetos_celestes)', 'subquery'],
    [8, 'WITH equipes AS (SELECT equipe,COUNT(*) AS total FROM investigacoes GROUP BY equipe) SELECT equipe,total FROM equipes UNION ALL SELECT 3,3', 'cte'],
    [8, 'SELECT equipe,apelido,ROW_NUMBER() OVER(ORDER BY id_investigacao) FROM investigacoes', 'window'],
    [8, 'SELECT equipe,apelido,ROW_NUMBER() OVER(PARTITION BY equipe ORDER BY id_investigacao DESC) FROM investigacoes', 'window']
  ];

  for (const [phase, query, objective] of cases) {
    const result = await evaluateChallenge(phase, [query], 1);
    assert.ok(!result.milestones.includes(objective), `Fase ${phase}: ${objective} aceitou ${query}`);
  }
});

test('aulas 6 a 8: aceita aliases, equivalências de filtro e projeções reordenadas com resultados iguais', async () => {
  const queries = {
    6: [
      "SELECT o.nome AS objeto FROM objetos_celestes AS o WHERE o.ano BETWEEN 1987 AND 1987 AND o.setor IN ('N-04') ORDER BY objeto",
      'SELECT DISTINCT o.setor AS setor_observado FROM objetos_celestes AS o',
      'SELECT COUNT(id_objeto_celeste) AS total, ano AS ano_relatorio FROM objetos_celestes GROUP BY ano_relatorio ORDER BY total DESC, ano_relatorio'
    ],
    7: [
      "SELECT o.setor AS setor_atual,o.nome AS objeto FROM acessos_celestes AS a INNER JOIN objetos_celestes AS o USING (id_objeto_celeste) WHERE a.status='valido' AND a.ano BETWEEN 1987 AND 1987",
      'SELECT o.* FROM objetos_celestes AS o LEFT OUTER JOIN acessos_celestes AS a ON a.id_objeto_celeste=o.id_objeto_celeste WHERE a.id_acesso_celeste IS NULL',
      'SELECT COUNT(a.id_acesso_celeste) AS total,o.nome AS objeto FROM acessos_celestes AS a JOIN objetos_celestes AS o USING (id_objeto_celeste) GROUP BY o.nome'
    ],
    8: [
      'SELECT a.* FROM acessos_celestes AS a WHERE EXISTS (SELECT 1 FROM objetos_celestes AS o WHERE o.id_objeto_celeste=a.id_objeto_celeste AND o.ano=1987)',
      'WITH resumo AS (SELECT equipe AS equipe_nome,COUNT(*) AS total FROM investigacoes GROUP BY equipe_nome) SELECT total,equipe_nome FROM resumo ORDER BY equipe_nome',
      'SELECT ROW_NUMBER() OVER(PARTITION BY equipe ORDER BY id_investigacao) AS posicao,apelido AS pessoa,equipe AS grupo FROM investigacoes'
    ]
  };

  for (const [phaseText, phaseQueries] of Object.entries(queries)) {
    const phase = Number(phaseText);
    const result = await evaluateChallenge(phase, phaseQueries, 1);
    assert.deepEqual(new Set(result.milestones), new Set(LESSONS[phase].objectives.map(([key]) => key)));
  }
});

test('aula 8: a pergunta final aponta para o tema dos registros parciais', () => {
  assert.match(LESSONS[8].answerPrompt, /registros parciais reunidos/i);
  assert.equal(LESSONS[8].answer, 'FRAGMENTOS');
  assert.match(LESSONS[8].objectives[2][1], /ordem crescente do identificador/i);
});

test('aula 5 e aula 6: perguntas finais e objetivo do filtro usam referências claras', () => {
  assert.match(LESSONS[5].answerPrompt, /aglomerado de seis estrelas inserido e confirmado/i);
  assert.doesNotMatch(LESSONS[5].answerPrompt, /PLEIADES/i);
  assert.match(LESSONS[6].objectives[0][1], /registro ORION/i);
  assert.doesNotMatch(LESSONS[6].objectives[0][1], /primeiro registro/i);
  assert.match(CONCEPTS[6].prompt, /agrupada por ano/i);
  assert.doesNotMatch(CONCEPTS[6].prompt, /acessos válidos/i);
});

test('estrutura é consultada pelo botão sem aceitar PRAGMA como SQL do aluno', async () => {
  assert.equal(allowedStatement(3, 'PRAGMA table_info(evidencias);'), false);
  assert.equal(allowedStatement(4, 'PRAGMA table_info(observadores);'), false);
  assert.equal(allowedStatement(5, 'PRAGMA table_info(simbolos);'), false);
  assert.equal(allowedStatement(5, 'PRAGMA table_info(usuarios);'), false);
  assert.equal(allowedStatement(5, 'PRAGMA foreign_keys = OFF;'), false);

  const structure = await evaluateChallenge(5, [], 1, false, { inspectTable: 'simbolos' });
  assert.ok(structure.schema.length > 0);
  assert.deepEqual((await inspectArchiveSchema('usuarios')).map(column => column.name), ['id_usuario', 'usuario', 'nome', 'codigo', 'nivel', 'ativo']);
  await assert.rejects(inspectArchiveSchema('sqlite_master'));
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
  const oldUser = 'SELECT * FROM usuarios WHERE id_usuario = 37;';
  assert.ok(queryMilestones(2, oldCount, await executeArchiveQuery(oldCount)).includes('window'));
  assert.ok(queryMilestones(2, oldUser, await executeArchiveQuery(oldUser)).includes('identify'));
  await assert.rejects(executeArchiveQuery('SELECT * FROM usuarios WHERE id = 37;'));
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
