import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js/dist/sql-asm.js';
import { PHASE_THREE, phaseThreeMilestones } from './phase3.js';

const seed = readFileSync(fileURLToPath(new URL('./curso.sql', import.meta.url)), 'utf8');
const archiveSeed = readFileSync(fileURLToPath(new URL('./caso.sql', import.meta.url)), 'utf8');
const engine = initSqlJs();

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
    title: 'O Padrão Quebrado', code: 'OBSERVATÓRIO // 1987', theme: 'catalog',
    mission: 'O catálogo repete os dados de um observador. Organize os contatos sem apagar os cinco objetos nem as três observações já registradas.',
    answerPrompt: 'Informe o código que encerra a investigação.',
    initial: 'SELECT * FROM catalogo_bruto;', tables: ['catalogo_bruto', 'objetos_celestes'],
    objectives: [
      ['alter', 'Em objetos_celestes, criar origem_objeto_celeste (TEXT) e preservar os cinco objetos. Não é preciso preencher a coluna.'],
      ['observadores', 'Criar observadores com id_observador (INTEGER, chave primária), nome_observador (TEXT obrigatório) e telefone_observador (TEXT obrigatório).'],
      ['unico', 'Impedir telefone repetido em observadores.'],
      ['relacoes', 'Criar observacoes_catalogo com chave primária, referências obrigatórias a objetos e observadores, nome_observatorio obrigatório e vínculo único por objeto, observador e observatório.'],
      ['migrar_observadores', 'Copiar de catalogo_bruto cada combinação distinta de nome e telefone; devem resultar dois contatos.'],
      ['migrar_observacoes', 'Copiar as três linhas de catalogo_bruto, relacionando cada objeto pelo nome e cada contato por nome e telefone.']
    ],
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
    title: 'A Sexta Estrela', code: 'OBSERVATÓRIO // 1987', theme: 'transaction',
    mission: 'Três inconsistências foram encontradas no arquivo de símbolos. Corrija os dados da cópia de investigação.',
    answerPrompt: 'Depois das correções, um nome resiste ao ruído. Qual?',
    initial: 'SELECT * FROM simbolos;', tables: ['simbolos'],
    objectives: [
      ['insert', 'Inserir o aglomerado de seis estrelas como confirmado'],
      ['update', 'Confirmar o símbolo pendente de seis estrelas'],
      ['delete', 'Remover somente a marca com quantidade incorreta de estrelas'],
      ['transaction', 'Agrupar ao menos uma correção entre BEGIN e COMMIT']
    ],
    hints: ['Compare as quantidades de estrelas e os estados dos registros.', 'Uma correção adiciona um registro. Outra altera um registro existente.', 'A exclusão deve preservar as duas evidências válidas. Confirme a transação ao final.'],
    answer: 'PLEIADES'
  },
  6: {
    title: 'Eco no Setor Norte', code: 'INTERCEPTAÇÃO // NÓ', theme: 'scanner',
    mission: 'Há sinais de anos diferentes. Encontre o conjunto que corresponde ao incidente e resuma o arquivo.',
    answerPrompt: 'Qual é o código do setor associado aos registros do incidente?',
    initial: 'SELECT * FROM objetos_celestes;', tables: ['objetos_celestes', 'acessos_celestes'],
    objectives: [
      ['filter', 'Filtrar os objetos de 1987 pelo setor do primeiro registro'],
      ['distinct', 'Listar setores sem repetição'],
      ['aggregate', 'Contar objetos por ano e ordenar o maior grupo primeiro']
    ],
    hints: ['Ano e setor precisam ser considerados juntos.', 'Alguns setores se repetem.', 'Um resumo por ano mostra onde os registros se concentram.'],
    answer: 'N-04'
  },
  7: {
    title: 'Linhas Cruzadas', code: 'INTERCEPTAÇÃO // NÓ', theme: 'relations',
    mission: 'Os acessos guardam números, enquanto os objetos guardam nomes. Reúna as duas perspectivas.',
    answerPrompt: 'Depois do cruzamento dos acessos e dos objetos, em qual setor está o aglomerado identificado?',
    initial: 'SELECT * FROM acessos_celestes;', tables: ['acessos_celestes', 'objetos_celestes'],
    objectives: [
      ['inner', 'Relacionar acessos válidos de 1987 aos nomes e setores dos objetos'],
      ['left', 'Encontrar um objeto sem acesso com LEFT JOIN'],
      ['group', 'Contar acessos por objeto após o JOIN']
    ],
    hints: ['Procure a chave que liga as duas tabelas.', 'Uma das respostas está justamente na ausência de correspondência.', 'Conte os acessos depois de estabelecer a relação.'],
    answer: 'N-06'
  },
  8: {
    title: 'O Sétimo Rastro', code: 'INTERCEPTAÇÃO // NÓ', theme: 'analysis',
    mission: 'Os fragmentos das equipes parecem isolados. Um padrão de repetição pode revelar a ordem dos acontecimentos.',
    answerPrompt: 'Os rastros isolados agora podem ser lidos em conjunto. Como você identifica o que foi reunido?',
    initial: 'SELECT * FROM investigacoes;', tables: ['investigacoes', 'acessos_celestes'],
    objectives: [
      ['subquery', 'Selecionar usuários ligados a objetos de 1987 com subconsulta'],
      ['cte', 'Criar uma CTE que resuma os fragmentos por equipe'],
      ['window', 'Numerar registros dentro de cada equipe com ROW_NUMBER e PARTITION BY']
    ],
    hints: ['Uma consulta pode alimentar o filtro de outra.', 'Organize uma etapa intermediária antes da consulta principal.', 'Numere as linhas dentro de cada equipe sem agrupá-las em uma só.'],
    answer: 'FRAGMENTOS'
  },
  9: {
    title: 'Última Transmissão', code: 'OPERAÇÃO // 3301', theme: 'nosql',
    mission: 'Três registros da sua equipe apontam para uma identidade que não aparece no diretório.',
    answerPrompt: 'Qual código identifica o usuário ausente?',
    initial: 'SELECT * FROM sessoes_arg;', tables: ['sessoes_arg', 'dispositivos_arg', 'identidades_arg'],
    objectives: [
      ['join_three', 'Cruzar sessão, dispositivo e identidade da sua equipe'],
      ['secret', 'Encontrar o código do usuário oculto nos registros relacionados'],
      ['nosql', 'Responder a pergunta breve sobre consultas em MongoDB']
    ],
    hints: ['Cada integrante guarda uma parte da relação.', 'A sessão liga dois fragmentos. Outro identificador leva ao terceiro.', 'Compare o código encontrado com os usuários visíveis.'],
    answer: 'US0'
  }
};

export function allowedStatement(phaseId, query) {
  const cleaned = String(query || '').replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  if (!cleaned || cleaned.length > 5000 || cleaned.split(';').filter(Boolean).length > 1) return false;
  if (/\b(ATTACH|DETACH|VACUUM|LOAD_EXTENSION)\b/i.test(cleaned)) return false;
  if (phaseId === 3) return /^(SELECT|WITH|PRAGMA\s+table_info)/i.test(cleaned) && !/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE)\b/i.test(cleaned);
  if (phaseId === 4) return /^(CREATE\s+TABLE|CREATE\s+(?:UNIQUE\s+)?INDEX|ALTER\s+TABLE\s+objetos_celestes\b|INSERT(?:\s+OR\s+IGNORE)?\s+INTO\s+(?:observadores|observacoes_catalogo)\b|SELECT|PRAGMA\s+(?:table_info|foreign_key_list|index_list|index_info))/i.test(cleaned);
  if (phaseId === 5) return /^(INSERT|UPDATE|DELETE|SELECT|BEGIN|COMMIT|ROLLBACK|SAVEPOINT)/i.test(cleaned);
  return /^(SELECT|WITH|PRAGMA\s+table_info)/i.test(cleaned) && !/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE)\b/i.test(cleaned);
}

export async function evaluateChallenge(phaseId, queries, groupId, nosqlDone = false) {
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
      if (!allowedStatement(phaseId, query)) { lastSucceeded = false; continue; }
      const statementKey = String(query).replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/;\s*$/, '');
      const changesPhaseFourState = phaseId === 4 && /^(?:CREATE\s+TABLE|CREATE\s+(?:UNIQUE\s+)?INDEX|ALTER\s+TABLE|INSERT\b)/i.test(statementKey);
      if (changesPhaseFourState && appliedPhaseFourStatements.has(statementKey)) {
        result = [];
        lastSucceeded = true;
        lastError = null;
        continue;
      }
      try {
        result = db.exec(query);
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
    return {
      milestones: [...milestones],
      result: result.map(set => ({ columns: set.columns, values: set.values.slice(0, 100) })),
      ...(tables ? { tables } : {}),
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
function count(db, query) { return Number(db.exec(query)[0]?.values[0]?.[0] || 0); }
function sameRows(left, right) {
  const normalize = values => values.map(row => JSON.stringify(row)).sort();
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
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
      const source = db.exec(`SELECT DISTINCT nome_observador,telefone_observador FROM catalogo_bruto ORDER BY nome_observador,telefone_observador`)[0]?.values || [];
      const migrated = db.exec(`SELECT nome_observador,telefone_observador FROM observadores ORDER BY nome_observador,telefone_observador`)[0]?.values || [];
      if (source.length === 2 && sameRows(source, migrated)) found.push('migrar_observadores');
    }

    if (observationSchema && hasSingleColumnUniqueIndex(db, 'observadores', 'telefone_observador')) {
      const source = db.exec(`SELECT o.id_objeto_celeste,ob.id_observador,c.nome_observatorio
        FROM catalogo_bruto c
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
    if (/FROM\s+OBJETOS_CELESTES/.test(q) && /WHERE/.test(q) && /ANO/.test(q) && /SETOR/.test(q) && includes(result,'ORION')) found.push('filter');
    if (/SELECT\s+DISTINCT\s+SETOR/.test(q) && includes(result,'N-04') && includes(result,'N-06')) found.push('distinct');
    if (/COUNT\s*\(/.test(q) && /GROUP\s+BY/.test(q) && /ORDER\s+BY/.test(q) && includes(result,1987) && includes(result,3)) found.push('aggregate');
  } else if (id === 7) {
    if (/JOIN\s+OBJETOS_CELESTES/.test(q) && /FROM\s+ACESSOS_CELESTES/.test(q) && /WHERE/.test(q) && includes(result,'PLEIADES') && includes(result,'N-06')) found.push('inner');
    if (/LEFT\s+JOIN\s+ACESSOS_CELESTES/.test(q) && /FROM\s+OBJETOS_CELESTES/.test(q) && /IS\s+NULL/.test(q) && includes(result,'ORION-B')) found.push('left');
    if (/JOIN/.test(q) && /COUNT\s*\(/.test(q) && /GROUP\s+BY/.test(q) && includes(result,'PLEIADES') && includes(result,4)) found.push('group');
  } else if (id === 8) {
    if (/(IN\s*\(\s*SELECT|EXISTS\s*\(\s*SELECT)/.test(q) && /ACESSOS_CELESTES/.test(q) && includes(result,'us1')) found.push('subquery');
    if (/^WITH\s+/.test(q) && /INVESTIGACOES/.test(q) && /GROUP\s+BY/.test(q) && includes(result,1) && includes(result,3)) found.push('cte');
    if (/ROW_NUMBER\s*\(\s*\)\s*OVER/.test(q) && /PARTITION\s+BY/.test(q) && /INVESTIGACOES/.test(q) && rows(result).length >= 6) found.push('window');
  } else if (id === 9) {
    const three = ['SESSOES_ARG','DISPOSITIVOS_ARG','IDENTIDADES_ARG'].every(t => q.includes(t)) && (q.match(/\bJOIN\b/g)||[]).length >= 2;
    const aliases = groupId === 1 ? ['us1','us2','us3'] : ['us4','us5','us6'];
    if (three && /GRUPO/.test(q) && includes(result,groupId) && aliases.every(alias => includes(result,alias))) found.push('join_three');
    if (three && /GRUPO/.test(q) && includes(result,0) && aliases.every(alias => includes(result,alias))) found.push('secret');
  }
  return found;
}
