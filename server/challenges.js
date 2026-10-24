import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js/dist/sql-asm.js';
import { PHASE_THREE, phaseThreeMilestones } from './phase3.js';

const seed = readFileSync(fileURLToPath(new URL('./curso.sql', import.meta.url)), 'utf8');
const archiveSeed = readFileSync(fileURLToPath(new URL('./caso.sql', import.meta.url)), 'utf8');
const engine = initSqlJs();
const ARCHIVE_TABLES = ['usuarios', 'mensagens', 'arquivos', 'pessoas', 'acessos'];

export async function executeArchiveQuery(query) {
  const SQL = await engine;
  const db = new SQL.Database();
  try {
    db.run(archiveSeed);
    return db.exec(query).map(set => ({ columns: set.columns, values: set.values.slice(0, 100) }));
  } finally {
    db.close();
  }
}

export async function inspectArchiveSchema(table) {
  if (!ARCHIVE_TABLES.includes(String(table))) throw new Error('Tabela fora do escopo da fase.');
  const SQL = await engine;
  const db = new SQL.Database();
  try {
    db.run(archiveSeed);
    return describeTable(db, table);
  } finally {
    db.close();
  }
}

export async function previewInitialQuery(phaseId) {
  if (Number(phaseId) !== 4) return [];
  const SQL = await engine;
  const db = new SQL.Database();
  try {
    db.run(seed);
    return db.exec(LESSONS[4].initial).map(set => ({ columns: set.columns, values: set.values.slice(0, 100) }));
  } finally {
    db.close();
  }
}

export const LESSONS = {
  3: PHASE_THREE,
  4: {
    title: 'O Padrão Quebrado', theme: 'catalog',
    mission: 'O catálogo repete os dados de um observador. Organize os contatos sem apagar os cinco objetos nem as três observações já registradas.',
    answerPrompt: 'Informe o código que encerra a investigação.',
    initial: 'SELECT * FROM registros_catalogo_bruto;', tables: ['registros_catalogo_bruto', 'objetos_celestes'],
    warmup: {
      title: 'Exemplo: medições de sensores',
      intro: 'Compare as medições e observe quais dados se repetem e quais variam.',
      columns: ['Sensor', 'Setor', 'Umidade', 'Horário'],
      source: [
        ['S-A', 'JARDIM', 61, '14:00'],
        ['S-A', 'JARDIM', 63, '14:15'],
        ['S-B', 'ESTUFA', 55, '14:20']
      ],
      questions: [
        'Que informação aparece em mais de uma medição?',
        'Quais valores variam entre as medições?',
        'Que conferências ajudariam a manter cada medição ligada ao sensor correto?'
      ]
    },
    objectives: [
      ['alter', '4.1 // Na tabela objetos_celestes, adicionar a coluna origem_objeto_celeste (TEXT), sem alterar os cinco registros existentes'],
      ['observadores', '4.2 // Criar a tabela observadores com as colunas id_observador (INTEGER, chave primária), nome_observador (TEXT obrigatório) e telefone_observador (TEXT obrigatório)'],
      ['unico', '4.3 // Na tabela observadores, impedir valores repetidos na coluna telefone_observador'],
      ['relacoes', '4.4 // Na tabela observacoes_catalogo, definir a coluna id_observacao_catalogo como chave primária; tornar obrigatórias as colunas id_objeto_celeste, id_observador e nome_observatorio; criar chaves estrangeiras de id_objeto_celeste para objetos_celestes.id_objeto_celeste e de id_observador para observadores.id_observador; impedir repetição da combinação id_objeto_celeste, id_observador e nome_observatorio'],
      ['migrar_observadores', '4.5 // Migrar para a tabela observadores os pares distintos de valores das colunas nome_observador e telefone_observador; o resultado deve conter 2 registros'],
      ['migrar_observacoes', '4.6 // Migrar os 3 registros de origem para a tabela observacoes_catalogo; associar cada objeto pelo nome em objetos_celestes e cada observador pelo nome e telefone em observadores']
    ],
    requirements: {
      title: 'Critérios para revisar o catálogo',
      intro: 'Use estes critérios para revisar o resultado quando precisar. Eles descrevem o que os dados devem garantir, sem indicar os comandos ou a ordem da solução.',
      headers: ['Parte do caso', 'Condição de sucesso'],
      rows: [
        ['Objetos catalogados', 'Preserve os cinco registros existentes e acrescente a informação de origem.'],
        ['Cadastro de observadores', 'Cada pessoa deve ter um cadastro próprio, com nome e contato informados.'],
        ['Contatos', 'Um mesmo contato não pode identificar mais de um cadastro.'],
        ['Observações', 'Cada registro deve corresponder a um objeto e a um observador existentes, além de informar o observatório.'],
        ['Duplicidade', 'A mesma combinação de objeto, observador e observatório não deve aparecer duas vezes.'],
        ['Resultado da migração', 'Ao final, devem permanecer 5 objetos e existir 2 observadores e 3 observações.']
      ],
      expected: 'Confira também se nenhuma observação ficou sem vínculo válido.'
    },
    hints: [
      'Os dados de origem já estão carregados: o catálogo tem 3 registros e a tabela de objetos tem 5. Execute a consulta inicial para vê-los. As tabelas de destino ainda não existem; você vai criá-las e preenchê-las.',
      'Compare os três registros do catálogo. O mesmo contato aparece mais de uma vez; ele deve ser guardado uma só vez.',
      'Use ALTER TABLE para acrescentar origem_objeto_celeste como TEXT. Essa etapa muda a estrutura; os cinco objetos devem continuar lá e a nova coluna pode ficar sem valores.',
      'Crie observadores com id_observador como chave primária INTEGER. Os campos nome_observador e telefone_observador devem ser TEXT e obrigatórios.',
      'Adicione uma regra UNIQUE para telefone_observador; ela pode ser uma restrição da tabela ou um índice único.',
      'Crie observacoes_catalogo com id_observacao_catalogo como chave primária, id_objeto_celeste e id_observador obrigatórios e nome_observatorio obrigatório. Faça os dois IDs referenciarem as tabelas correspondentes.',
      'A combinação id_objeto_celeste + id_observador + nome_observatorio não pode se repetir. Compare as três linhas da origem com o resultado migrado.',
      'Para copiar contatos sem duplicar, use SELECT DISTINCT sobre nome_observador e telefone_observador. O resultado esperado são 2 linhas.',
      'Para copiar observações, relacione o catálogo aos objetos pelo nome e aos observadores por nome e telefone. Confira os totais finais: 5 objetos, 2 contatos e 3 observações.'
    ],
    answer: 'NORMALIZACAO'
  },
  5: {
    title: 'A Sexta Estrela', theme: 'transaction',
    mission: 'Três inconsistências foram encontradas no arquivo de símbolos. Corrija os dados da cópia de investigação.',
    answerPrompt: 'Qual é o nome do aglomerado de seis estrelas inserido e confirmado?',
    initial: 'SELECT * FROM simbolos;', tables: ['simbolos', 'fontes_externas'],
    objectives: [
      ['insert', '5.1 // Inserir em simbolos o aglomerado de seis estrelas com status confirmado'],
      ['update', '5.2 // Alterar para confirmado o registro pendente de seis estrelas'],
      ['delete', '5.3 // Excluir somente a marca falsa, que tem quantidade incorreta de estrelas'],
      ['transaction', '5.4 // Executar ao menos uma dessas correções entre BEGIN e COMMIT']
    ],
    hints: ['Compare as quantidades de estrelas e os estados dos registros.', 'Uma correção adiciona um registro. Outra altera um registro existente.', 'A exclusão deve preservar as duas evidências válidas. Confirme a transação ao final.', 'A tabela fontes_externas aponta para uma ficha do catálogo Messier. Compare o código da fonte com o aglomerado de seis estrelas.'],
    answer: 'PLEIADES'
  },
  6: {
    title: 'Eco no Setor Norte', theme: 'scanner',
    mission: 'Há sinais de anos diferentes. Encontre o conjunto que corresponde ao incidente e resuma o arquivo.',
    answerPrompt: 'Qual é o código do setor associado aos registros do incidente?',
    initial: 'SELECT * FROM objetos_celestes;', tables: ['objetos_celestes', 'acessos_celestes'],
    objectives: [
      ['filter', '6.1 // Filtrar objetos com ano 1987 e o setor associado ao registro ORION'],
      ['distinct', '6.2 // Listar cada valor de objetos_celestes.setor uma única vez com DISTINCT'],
      ['aggregate', '6.3 // Contar objetos por ano e ordenar do maior total para o menor']
    ],
    hints: ['Ano e setor precisam ser considerados juntos.', 'Alguns setores se repetem.', 'Um resumo por ano mostra onde os registros se concentram.'],
    answer: 'N-04'
  },
  7: {
    title: 'Linhas Cruzadas', theme: 'relations',
    mission: 'Os acessos guardam números, enquanto os objetos guardam nomes. Reúna as duas perspectivas.',
    answerPrompt: 'Depois do cruzamento dos acessos e dos objetos, em qual setor está o aglomerado identificado?',
    initial: 'SELECT * FROM acessos_celestes;', tables: ['acessos_celestes', 'objetos_celestes'],
    objectives: [
      ['inner', '7.1 // Unir acessos e objetos por id_objeto_celeste; filtrar ano 1987 e status valido; exibir nome e setor'],
      ['left', '7.2 // Usar LEFT JOIN para localizar objetos sem id_acesso_celeste correspondente'],
      ['group', '7.3 // Após o JOIN, contar os acessos de cada objeto agrupados por nome']
    ],
    hints: ['Procure a chave que liga as duas tabelas.', 'Uma das respostas está justamente na ausência de correspondência.', 'Conte os acessos depois de estabelecer a relação.'],
    answer: 'N-06'
  },
  8: {
    title: 'O Sétimo Rastro', theme: 'analysis',
    mission: 'Os fragmentos das equipes parecem isolados. Um padrão de repetição pode revelar a ordem dos acontecimentos.',
    answerPrompt: 'Digite a palavra que resume os registros parciais reunidos nesta fase.',
    initial: 'SELECT * FROM investigacoes;', tables: ['investigacoes', 'acessos_celestes'],
    objectives: [
      ['subquery', '8.1 // Usar uma subconsulta em objetos_celestes para filtrar acessos de 1987 e exibir usuario'],
      ['cte', '8.2 // Com uma CTE, contar linhas de investigacoes para cada equipe'],
      ['window', '8.3 // Numerar investigacoes dentro de cada equipe pela ordem crescente do identificador id_investigacao, com ROW_NUMBER e PARTITION BY']
    ],
    hints: ['Uma consulta pode alimentar o filtro de outra.', 'Organize uma etapa intermediária antes da consulta principal.', 'Numere as linhas de cada equipe pela ordem crescente do identificador, sem agrupá-las em uma só.'],
    answer: 'FRAGMENTOS'
  },
  9: {
    title: 'Última Transmissão', theme: 'nosql',
    mission: 'Três registros da sua equipe apontam para uma identidade que não aparece no diretório.',
    answerPrompt: 'Qual código identifica o usuário ausente?',
    initial: 'SELECT * FROM sessoes_arg;', tables: ['sessoes_arg', 'dispositivos_arg', 'identidades_arg'],
    objectives: [
      ['join_three', '9.1 // Em equipe, unir as três tabelas usando o mapa de relações abaixo e o grupo da equipe'],
      ['secret', '9.2 // Exibir o codigo de identidades_arg na linha ligada pelas duas junções'],
      ['nosql', '9.3 // Responder à checagem: qual método do MongoDB consulta documentos de uma coleção?']
    ],
    requirements: {
      title: 'Mapa dos dados',
      intro: 'As tabelas guardam partes diferentes do caso. Use a consulta de estrutura e compare os valores para descobrir como se relacionam; as chaves de ligação fazem parte do desafio.',
      headers: ['Fragmento', 'Informação disponível'],
      rows: [
        ['sessoes_arg', 'Sessões e usuários registrados por equipe.'],
        ['dispositivos_arg', 'Atividade de dispositivos associada às equipes.'],
        ['identidades_arg', 'Identidades registradas e códigos associados.']
      ],
      expected: 'Em grupo, expliquem quais valores conectam os fragmentos e confirmem que a identidade encontrada pertence à equipe.'
    },
    hints: [
      'Cada integrante guarda uma parte da relação.',
      'A sessão liga dois fragmentos. Outro identificador leva ao terceiro.',
      'Compare o código encontrado com os usuários visíveis.',
      { text: 'A checagem conceitual compara consultas SQL e MongoDB. Na documentação, procure o método que lê documentos de uma coleção e compare sua finalidade com SELECT.', link: { label: 'Documentação oficial do MongoDB', url: 'https://www.mongodb.com/docs/manual/reference/method/db.collection.find/' } }
    ],
    answer: 'US0'
  }
};

export function allowedStatement(phaseId, query) {
  const cleaned = String(query || '').replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  if (!cleaned || cleaned.length > 5000 || cleaned.split(';').filter(Boolean).length > 1) return false;
  if (/\b(ATTACH|DETACH|VACUUM|LOAD_EXTENSION)\b/i.test(cleaned)) return false;
  if (phaseId === 3) return /^(SELECT|WITH)\b/i.test(cleaned) && !/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|PRAGMA)\b/i.test(cleaned);
  if (phaseId === 4) {
    if (/^CREATE\s+TABLE\s+observadores\b/i.test(cleaned) && !hasIdentityColumnDefinition(cleaned, 'id_observador')) return false;
    if (/^CREATE\s+TABLE\s+observacoes_catalogo\b/i.test(cleaned) && !hasIdentityColumnDefinition(cleaned, 'id_observacao_catalogo')) return false;
    return /^(CREATE\s+TABLE|CREATE\s+(?:UNIQUE\s+)?INDEX|ALTER\s+TABLE\s+objetos_celestes\b|INSERT\s+INTO\s+(?:observadores|observacoes_catalogo)\b|SELECT)\b/i.test(cleaned);
  }
  if (phaseId === 5) return /^(INSERT|UPDATE|DELETE|SELECT|BEGIN|COMMIT|ROLLBACK|SAVEPOINT)\b/i.test(cleaned);
  return /^(SELECT|WITH)\b/i.test(cleaned) && !/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|PRAGMA)\b/i.test(cleaned);
}

export async function evaluateChallenge(phaseId, queries, groupId, nosqlDone = false, options = {}) {
  const SQL = await engine;
  // Cada avaliação usa uma cópia em memória; o histórico persistido é filtrado por usuário e fase na API.
  const db = new SQL.Database();
  const milestones = new Set();
  let result = [];
  let lastSucceeded = true;
  let lastError = null;
  let transactionOpen = false;
  let transactionTouched = false;
  const appliedPhaseFourStatements = new Set();
  try {
    db.run(seed);
    for (const query of queries) {
      const legacyIdentityDdl = phaseId === 4 && isLegacyPhaseFourIdentityDdl(query);
      const legacyInsert = phaseId === 4 && isLegacyPhaseFourInsert(query);
      if (isLegacySchemaInspection(query)) continue;
      if (!allowedStatement(phaseId, query) && !legacyIdentityDdl && !legacyInsert) { lastSucceeded = false; continue; }
      const statementKey = String(query).replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/;\s*$/, '');
      const changesPhaseFourState = phaseId === 4 && /^(?:CREATE\s+TABLE|CREATE\s+(?:UNIQUE\s+)?INDEX|ALTER\s+TABLE|INSERT\b)/i.test(statementKey);
      if (changesPhaseFourState && appliedPhaseFourStatements.has(statementKey)) {
        result = [];
        lastSucceeded = true;
        lastError = null;
        continue;
      }
      try {
        result = db.exec(phaseId === 4 ? normalizePostgresIdentityToSqlite(query) : query);
        lastSucceeded = true;
        lastError = null;
        if (changesPhaseFourState) appliedPhaseFourStatements.add(statementKey);
        checkMilestones(phaseId, query, result, db, groupId).forEach(key => milestones.add(key));
        if (phaseId === 5 && /^BEGIN\b/i.test(query.trim())) { transactionOpen = true; transactionTouched = false; }
        if (phaseId === 5 && transactionOpen && /^(INSERT|UPDATE|DELETE)\b/i.test(query.trim())) transactionTouched = true;
        if (phaseId === 5 && /^COMMIT\b/i.test(query.trim()) && transactionOpen && transactionTouched) {
          milestones.add('transaction');
          transactionOpen = false;
        }
      } catch (error) { lastSucceeded = false; lastError = error.message; }
    }
    if (phaseId === 9 && nosqlDone) milestones.add('nosql');
    const tables = phaseId === 4 ? phaseFourTableNames(db) : undefined;
    const schema = options.inspectTable ? describeTable(db, options.inspectTable) : undefined;
    return {
      milestones: [...milestones],
      result: result.map(set => ({ columns: set.columns, values: set.values.slice(0, 100) })),
      ...(tables ? { tables } : {}),
      ...(schema ? { schema } : {}),
      lastSucceeded,
      lastError
    };
  } finally {
    db.close();
  }
}

function rows(result) { return result.flatMap(item => item.values); }
function includes(result, value) { return rows(result).some(row => row.some(cell => String(cell).toUpperCase() === String(value).toUpperCase())); }
function tableInfo(db, name) { return db.exec(`PRAGMA table_info(${name})`)[0]?.values || []; }
function hasIdentityColumnDefinition(query, column) {
  const safeColumn = column.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${safeColumn}\\s+INTEGER\\s+GENERATED\\s+(?:BY\\s+DEFAULT|ALWAYS)\\s+AS\\s+IDENTITY\\b`, 'i').test(String(query));
}
function isLegacyPhaseFourIdentityDdl(query) {
  const cleaned = String(query || '').replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  const match = cleaned.match(/^CREATE\s+TABLE\s+(observadores|observacoes_catalogo)\b/i);
  if (!match) return false;
  const column = match[1].toLowerCase() === 'observadores' ? 'id_observador' : 'id_observacao_catalogo';
  return !hasIdentityColumnDefinition(cleaned, column)
    && new RegExp(`\\b${column}\\s+INTEGER\\b`, 'i').test(cleaned)
    && /\bPRIMARY\s+KEY\b/i.test(cleaned);
}
function isLegacyPhaseFourInsert(query) {
  const cleaned = String(query || '').replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  return /^INSERT\s+OR\s+IGNORE\s+INTO\s+(?:observadores|observacoes_catalogo)\b/i.test(cleaned);
}
function isLegacySchemaInspection(query) {
  const cleaned = String(query || '').replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  return /^PRAGMA\s+(?:table_info|foreign_key_list|index_list|index_info)\s*\(/i.test(cleaned);
}
function describeTable(db, name) {
  const safeName = String(name).replaceAll('"', '""');
  const columns = db.exec(`PRAGMA table_info("${safeName}")`)[0]?.values || [];
  const foreignKeys = db.exec(`PRAGMA foreign_key_list("${safeName}")`)[0]?.values || [];
  return columns.map(([, columnName, type, notNull, , primaryKey]) => {
    const foreignKey = foreignKeys.find(key => key[3] === columnName);
    return {
      name: columnName,
      type: type || '',
      nullable: !notNull && !primaryKey,
      primary_key: primaryKey === 1,
      foreign_key: foreignKey ? { table: foreignKey[2], column: foreignKey[4] } : null
    };
  });
}
function normalizePostgresIdentityToSqlite(query) {
  const statement = String(query);
  if (!/^\s*CREATE\s+TABLE\b/i.test(statement)) return statement;
  return statement.replace(/\bGENERATED\s+(?:BY\s+DEFAULT|ALWAYS)\s+AS\s+IDENTITY(?:\s*\([^)]*\))?/gi, '');
}
function count(db, query) { return Number(db.exec(query)[0]?.values[0]?.[0] || 0); }
function sameRows(left, right) {
  const normalize = values => values.map(row => JSON.stringify(row)).sort();
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

function hasExactValues(result, expected) {
  if (result.length !== 1 || result[0].values.length !== expected.length) return false;
  const set = result[0];
  return set.columns.some((_, index) => sameRows(
    set.values.map(row => [row[index]]),
    expected.map(value => [value])
  ));
}

function hasExactPairs(result, expected, { secondDescending = false } = {}) {
  if (result.length !== 1 || result[0].values.length !== expected.length) return false;
  const { columns, values } = result[0];
  for (let first = 0; first < columns.length; first++) {
    for (let second = first + 1; second < columns.length; second++) {
      for (const [left, right] of [[first, second], [second, first]]) {
        const pairs = values.map(row => [row[left], row[right]]);
        if (!sameRows(pairs, expected)) continue;
        if (!secondDescending || pairs.every((pair, index) => index === 0 || Number(pairs[index - 1][1]) >= Number(pair[1]))) {
          return true;
        }
      }
    }
  }
  return false;
}

function hasExactTriples(result, expected) {
  if (result.length !== 1 || result[0].values.length !== expected.length) return false;
  const { columns, values } = result[0];
  for (let first = 0; first < columns.length; first++) {
    for (let second = 0; second < columns.length; second++) {
      if (second === first) continue;
      for (let third = 0; third < columns.length; third++) {
        if (third === first || third === second) continue;
        if (sameRows(values.map(row => [row[first], row[second], row[third]]), expected)) return true;
      }
    }
  }
  return false;
}

function phaseFourTableNames(db) {
  const rows = db.exec("SELECT name FROM sqlite_master WHERE type='table'")[0]?.values || [];
  const existing = new Set(rows.map(([name]) => String(name).toLowerCase()));
  return [...LESSONS[4].tables, 'observadores', 'observacoes_catalogo'].filter(name => existing.has(name.toLowerCase()));
}

function hasSingleColumnUniqueIndex(db, table, column) {
  return hasUniqueIndexForColumns(db, table, [column]);
}

function hasUniqueIndexForColumns(db, table, expectedColumns) {
  const indexes = db.exec(`PRAGMA index_list(${table})`)[0]?.values || [];
  return indexes.some(index => {
    if (index[2] !== 1) return false;
    const columns = db.exec(`PRAGMA index_info("${String(index[1]).replace(/"/g, '""')}")`)[0]?.values || [];
    return sameRows(columns.map(column => [column[2]]), expectedColumns.map(column => [column]));
  });
}

function phaseFourSourceObjectsPreserved(db) {
  const current = db.exec('SELECT id_objeto_celeste,nome,tipo,ano,setor FROM objetos_celestes ORDER BY id_objeto_celeste')[0]?.values || [];
  return sameRows(current, [
    [1, 'ORION', 'constelacao', 1987, 'N-04'],
    [2, 'ALDEBARAN', 'estrela', 1986, 'N-04'],
    [3, 'PLEIADES', 'aglomerado', 1987, 'N-06'],
    [4, 'SIRIUS', 'estrela', 1988, 'S-02'],
    [5, 'ORION-B', 'constelacao', 1987, 'N-04']
  ]);
}

function hasPhaseFourObserverSchema(db) {
  const columns = tableInfo(db, 'observadores');
  const id = columns.find(column => column[1] === 'id_observador');
  const name = columns.find(column => column[1] === 'nome_observador');
  const phone = columns.find(column => column[1] === 'telefone_observador');
  return id?.[2]?.toUpperCase() === 'INTEGER' && id?.[5] === 1
    && name?.[2]?.toUpperCase() === 'TEXT' && name?.[3] === 1
    && phone?.[2]?.toUpperCase() === 'TEXT' && phone?.[3] === 1;
}

function hasPhaseFourObservationSchema(db) {
  const columns = tableInfo(db, 'observacoes_catalogo');
  const id = columns.find(column => column[1] === 'id_observacao_catalogo');
  const objectId = columns.find(column => column[1] === 'id_objeto_celeste');
  const observerId = columns.find(column => column[1] === 'id_observador');
  const observatory = columns.find(column => column[1] === 'nome_observatorio');
  const foreignKeys = db.exec('PRAGMA foreign_key_list(observacoes_catalogo)')[0]?.values || [];
  return id?.[2]?.toUpperCase() === 'INTEGER' && id?.[5] === 1
    && objectId?.[3] === 1 && observerId?.[3] === 1 && observatory?.[3] === 1
    && hasUniqueIndexForColumns(db, 'observacoes_catalogo', ['id_objeto_celeste', 'id_observador', 'nome_observatorio'])
    && foreignKeys.some(key => key[2] === 'objetos_celestes' && key[3] === 'id_objeto_celeste' && key[4] === 'id_objeto_celeste')
    && foreignKeys.some(key => key[2] === 'observadores' && key[3] === 'id_observador' && key[4] === 'id_observador');
}

function checkMilestones(id, query, result, db, groupId) {
  const q = query.toUpperCase();
  const found = [];
  if (id === 3) {
    return phaseThreeMilestones(query, result);
  } else if (id === 4) {
    const origin = tableInfo(db, 'objetos_celestes').find(column => column[1] === 'origem_objeto_celeste');
    if (origin?.[2]?.toUpperCase() === 'TEXT' && phaseFourSourceObjectsPreserved(db)) found.push('alter');

    const observerSchema = hasPhaseFourObserverSchema(db);
    if (observerSchema) found.push('observadores');
    if (observerSchema && hasSingleColumnUniqueIndex(db, 'observadores', 'telefone_observador')) found.push('unico');

    const observationSchema = hasPhaseFourObservationSchema(db);
    if (observationSchema) found.push('relacoes');

    if (observerSchema) {
      const source = db.exec(`SELECT DISTINCT nome_observador,telefone_observador FROM registros_catalogo_bruto ORDER BY nome_observador,telefone_observador`)[0]?.values || [];
      const migrated = db.exec(`SELECT nome_observador,telefone_observador FROM observadores ORDER BY nome_observador,telefone_observador`)[0]?.values || [];
      if (source.length === 2 && sameRows(source, migrated)) found.push('migrar_observadores');
    }

    if (observationSchema && hasSingleColumnUniqueIndex(db, 'observadores', 'telefone_observador')) {
      const source = db.exec(`SELECT o.id_objeto_celeste,ob.id_observador,c.nome_observatorio
        FROM registros_catalogo_bruto c
        JOIN objetos_celestes o ON o.nome=c.nome_objeto_celeste
        JOIN observadores ob ON ob.nome_observador=c.nome_observador AND ob.telefone_observador=c.telefone_observador`)[0]?.values || [];
      const migrated = db.exec(`SELECT id_objeto_celeste,id_observador,nome_observatorio FROM observacoes_catalogo`)[0]?.values || [];
      const foreignKeyViolations = db.exec('PRAGMA foreign_key_check(observacoes_catalogo)')[0]?.values || [];
      if (source.length === 3 && sameRows(source, migrated) && foreignKeyViolations.length === 0) found.push('migrar_observacoes');
    }
  } else if (id === 5) {
    if (count(db,"SELECT COUNT(*) FROM simbolos WHERE nome='PLEIADES' AND estrelas=6 AND status='confirmado'") === 1) found.push('insert');
    if (count(db,"SELECT COUNT(*) FROM simbolos WHERE nome='SUBARU' AND status='confirmado'") === 1) found.push('update');
    if (count(db,"SELECT COUNT(*) FROM simbolos WHERE nome='MARCA FALSA'") === 0 && count(db,'SELECT COUNT(*) FROM simbolos') === 2) found.push('delete');
  } else if (id === 6) {
    if (/FROM\s+OBJETOS_CELESTES/.test(q) && /\bWHERE\b/.test(q) && /\bANO\b/.test(q) && /\bSETOR\b/.test(q)
      && hasExactValues(result, ['ORION', 'ORION-B'])) found.push('filter');
    if (/SELECT\s+DISTINCT\b/.test(q) && /\bSETOR\b/.test(q) && /FROM\s+OBJETOS_CELESTES/.test(q)
      && hasExactValues(result, ['N-04', 'N-06', 'S-02'])) found.push('distinct');
    if (/COUNT\s*\(/.test(q) && /GROUP\s+BY/.test(q) && /\bANO\b/.test(q) && /FROM\s+OBJETOS_CELESTES/.test(q)
      && /ORDER\s+BY/.test(q) && hasExactPairs(result, [[1987, 3], [1986, 1], [1988, 1]], { secondDescending: true })) found.push('aggregate');
  } else if (id === 7) {
    if (/JOIN\s+OBJETOS_CELESTES/.test(q) && /FROM\s+ACESSOS_CELESTES/.test(q) && /\bWHERE\b/.test(q)
      && hasExactPairs(result, [['ORION', 'N-04'], ['PLEIADES', 'N-06'], ['ORION', 'N-04'], ['PLEIADES', 'N-06'], ['PLEIADES', 'N-06'], ['PLEIADES', 'N-06']])) found.push('inner');
    if (/LEFT\s+(?:OUTER\s+)?JOIN\s+ACESSOS_CELESTES/.test(q) && /FROM\s+OBJETOS_CELESTES/.test(q) && /IS\s+NULL/.test(q)
      && hasExactValues(result, ['ORION-B'])) found.push('left');
    if (/JOIN\s+OBJETOS_CELESTES/.test(q) && /FROM\s+ACESSOS_CELESTES/.test(q) && /COUNT\s*\(/.test(q) && /GROUP\s+BY/.test(q)
      && hasExactPairs(result, [['ORION', 2], ['ALDEBARAN', 1], ['PLEIADES', 4], ['SIRIUS', 1]])) found.push('group');
  } else if (id === 8) {
    if (/(IN\s*\(\s*SELECT|EXISTS\s*\(\s*SELECT)/.test(q) && /ACESSOS_CELESTES/.test(q)
      && hasExactValues(result, ['us1', 'us2', 'us4', 'us5', 'us1', 'us4'])) found.push('subquery');
    if (/^\s*WITH\s+/.test(q) && /INVESTIGACOES/.test(q) && /COUNT\s*\(/.test(q) && /GROUP\s+BY/.test(q)
      && hasExactPairs(result, [[1, 3], [2, 3]])) found.push('cte');
    if (/ROW_NUMBER\s*\(\s*\)\s*OVER/.test(q) && /PARTITION\s+BY/.test(q) && /INVESTIGACOES/.test(q)
      && hasExactTriples(result, [[1, 'us1', 1], [1, 'us2', 2], [1, 'us3', 3], [2, 'us4', 1], [2, 'us5', 2], [2, 'us6', 3]])) found.push('window');
  } else if (id === 9) {
    const three = ['SESSOES_ARG','DISPOSITIVOS_ARG','IDENTIDADES_ARG'].every(t => q.includes(t)) && (q.match(/\bJOIN\b/g)||[]).length >= 2;
    const aliases = groupId === 1 ? ['us1','us2','us3'] : ['us4','us5','us6'];
    if (three && /GRUPO/.test(q) && includes(result,groupId) && aliases.every(alias => includes(result,alias))) found.push('join_three');
    if (three && /GRUPO/.test(q) && includes(result,0) && aliases.every(alias => includes(result,alias))) found.push('secret');
  }
  return found;
}
