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

export const LESSONS = {
  3: PHASE_THREE,
  4: {
    title: 'O Padrão Quebrado', code: 'OBSERVATÓRIO // 1987', theme: 'observatory',
    mission: 'O mesmo contato aparece em mais de um registro. Reorganize a estrutura sem perder as observações.',
    answerPrompt: 'O padrão quebrado recebeu um novo arranjo. Que nome descreve a transformação?',
    initial: 'SELECT * FROM catalogo_bruto;', tables: ['catalogo_bruto', 'objetos_celestes'],
    objectives: [
      ['alter', 'Adicionar origem à estrutura de objetos_celestes'],
      ['observadores', 'Criar observadores com identificador, nome e telefone'],
      ['unico', 'Impedir duplicação do telefone na nova tabela']
    ],
    hints: ['Os registros antigos ainda precisam existir após a correção.', 'Um contato repetido pode pertencer a uma entidade separada.', 'Impeça que a nova estrutura aceite o mesmo telefone duas vezes.'],
    answer: 'NORMALIZACAO'
  },
  5: {
    title: 'A Sexta Estrela', code: 'OBSERVATÓRIO // 1987', theme: 'observatory',
    mission: 'Três inconsistências foram encontradas no arquivo de símbolos. Corrija os dados da cópia de investigação.',
    answerPrompt: 'Depois das correções, um nome resiste ao ruído. Qual?',
    initial: 'SELECT * FROM simbolos;', tables: ['simbolos'],
    objectives: [
      ['insert', 'Inserir o aglomerado de seis estrelas como confirmado'],
      ['update', 'Confirmar o símbolo pendente de seis estrelas'],
      ['delete', 'Remover somente a marca com quantidade incorreta de estrelas'],
      ['transaction', 'Agrupar ao menos uma correção entre BEGIN e COMMIT']
    ],
    hints: ['Compare as quantidades de estrelas e os estados dos registros.', 'Uma correção adiciona; outra altera.', 'A exclusão deve preservar as duas evidências válidas. Confirme a transação ao final.'],
    answer: 'PLEIADES'
  },
  6: {
    title: 'Eco no Setor Norte', code: 'INTERCEPTAÇÃO // NÓ', theme: 'interception',
    mission: 'Há sinais de anos diferentes. Encontre o conjunto que corresponde ao incidente e resuma o arquivo.',
    answerPrompt: 'Um setor se repete no rastro certo. Qual identificação ele carrega?',
    initial: 'SELECT * FROM objetos_celestes;', tables: ['objetos_celestes', 'acessos_celestes'],
    objectives: [
      ['filter', 'Filtrar os objetos de 1987 no setor do primeiro registro'],
      ['distinct', 'Listar setores sem repetição'],
      ['aggregate', 'Contar objetos por ano e ordenar o maior grupo primeiro']
    ],
    hints: ['Ano e setor precisam ser considerados juntos.', 'Alguns setores se repetem.', 'Um resumo por ano mostra onde os registros se concentram.'],
    answer: 'N-04'
  },
  7: {
    title: 'Linhas Cruzadas', code: 'INTERCEPTAÇÃO // NÓ', theme: 'interception',
    mission: 'Os acessos guardam números, enquanto os objetos guardam nomes. Reúna as duas perspectivas.',
    answerPrompt: 'As linhas cruzadas formam um nome. Qual deles permanece?',
    initial: 'SELECT * FROM acessos_celestes;', tables: ['acessos_celestes', 'objetos_celestes'],
    objectives: [
      ['inner', 'Relacionar acessos válidos de 1987 aos nomes dos objetos'],
      ['left', 'Encontrar um objeto sem acesso com LEFT JOIN'],
      ['group', 'Contar acessos por objeto após o JOIN']
    ],
    hints: ['Procure a chave que liga as duas tabelas.', 'Uma das respostas está justamente na ausência de correspondência.', 'Conte os acessos depois de estabelecer a relação.'],
    answer: 'PLEIADES'
  },
  8: {
    title: 'O Sétimo Rastro', code: 'INTERCEPTAÇÃO // NÓ', theme: 'interception',
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
    title: 'Última Transmissão', code: 'OPERAÇÃO // 3301', theme: 'operation',
    mission: 'Três registros da sua equipe apontam para uma identidade que não aparece no diretório.',
    answerPrompt: 'O último cruzamento aponta para uma ausência. Quem falta?',
    initial: 'SELECT * FROM sessoes_arg;', tables: ['sessoes_arg', 'dispositivos_arg', 'identidades_arg'],
    objectives: [
      ['join_three', 'Cruzar sessão, dispositivo e identidade da sua equipe'],
      ['secret', 'Encontrar o código do usuário oculto nos registros relacionados'],
      ['nosql', 'Responder a pergunta breve sobre consultas em MongoDB']
    ],
    hints: ['Cada integrante guarda uma parte da relação.', 'A sessão liga dois fragmentos; outro identificador leva ao terceiro.', 'Compare o código encontrado com os usuários visíveis.'],
    answer: 'US0'
  }
};

export function allowedStatement(phaseId, query) {
  const cleaned = String(query || '').replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  if (!cleaned || cleaned.length > 5000 || cleaned.split(';').filter(Boolean).length > 1) return false;
  if (/\b(ATTACH|DETACH|VACUUM|LOAD_EXTENSION)\b/i.test(cleaned)) return false;
  if (phaseId === 3) return /^(SELECT|WITH|PRAGMA\s+table_info)/i.test(cleaned) && !/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE)\b/i.test(cleaned);
  if (phaseId === 4) return /^(CREATE\s+TABLE|ALTER\s+TABLE|SELECT|PRAGMA\s+table_info|PRAGMA\s+foreign_key_list)/i.test(cleaned);
  if (phaseId === 5) return /^(INSERT|UPDATE|DELETE|SELECT|BEGIN|COMMIT|ROLLBACK|SAVEPOINT)/i.test(cleaned);
  return /^(SELECT|WITH|PRAGMA\s+table_info)/i.test(cleaned) && !/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE)\b/i.test(cleaned);
}

export async function evaluateChallenge(phaseId, queries, groupId, nosqlDone = false) {
  const SQL = await engine;
  const db = new SQL.Database();
  const milestones = new Set();
  let result = [];
  let lastSucceeded = true;
  let lastError = null;
  let transactionOpen = false;
  let transactionTouched = false;
  try {
    db.run(seed);
    for (const query of queries) {
      if (!allowedStatement(phaseId, query)) { lastSucceeded = false; continue; }
      try {
        result = db.exec(query);
        lastSucceeded = true;
        lastError = null;
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
    return { milestones: [...milestones], result: result.map(set => ({ columns: set.columns, values: set.values.slice(0, 100) })), lastSucceeded, lastError };
  } finally {
    db.close();
  }
}

function rows(result) { return result.flatMap(item => item.values); }
function includes(result, value) { return rows(result).some(row => row.some(cell => String(cell).toUpperCase() === String(value).toUpperCase())); }
function tableInfo(db, name) { return db.exec(`PRAGMA table_info(${name})`)[0]?.values || []; }
function count(db, query) { return Number(db.exec(query)[0]?.values[0]?.[0] || 0); }

function checkMilestones(id, query, result, db, groupId) {
  const q = query.toUpperCase();
  const found = [];
  if (id === 3) {
    return phaseThreeMilestones(query, result);
  } else if (id === 4) {
    if (tableInfo(db, 'objetos_celestes').some(c => c[1] === 'origem')) found.push('alter');
    const observers = tableInfo(db, 'observadores');
    if (observers.some(c => c[1] === 'id' && c[5] === 1) && observers.some(c => c[1] === 'nome') && observers.some(c => c[1] === 'telefone')) found.push('observadores');
    const indexes = db.exec('PRAGMA index_list(observadores)')[0]?.values || [];
    if (indexes.some(index => index[2] === 1 && db.exec(`PRAGMA index_info("${index[1]}")`)[0]?.values.some(column => column[2] === 'telefone'))) found.push('unico');
  } else if (id === 5) {
    if (count(db,"SELECT COUNT(*) FROM simbolos WHERE nome='PLEIADES' AND estrelas=6 AND status='confirmado'") === 1) found.push('insert');
    if (count(db,"SELECT COUNT(*) FROM simbolos WHERE nome='SUBARU' AND status='confirmado'") === 1) found.push('update');
    if (count(db,"SELECT COUNT(*) FROM simbolos WHERE nome='MARCA FALSA'") === 0 && count(db,'SELECT COUNT(*) FROM simbolos') === 2) found.push('delete');
  } else if (id === 6) {
    if (/FROM\s+OBJETOS_CELESTES/.test(q) && /WHERE/.test(q) && /ANO/.test(q) && /SETOR/.test(q) && includes(result,'ORION')) found.push('filter');
    if (/SELECT\s+DISTINCT\s+SETOR/.test(q) && includes(result,'N-04') && includes(result,'N-06')) found.push('distinct');
    if (/COUNT\s*\(/.test(q) && /GROUP\s+BY/.test(q) && /ORDER\s+BY/.test(q) && includes(result,1987) && includes(result,3)) found.push('aggregate');
  } else if (id === 7) {
    if (/JOIN\s+OBJETOS_CELESTES/.test(q) && /FROM\s+ACESSOS_CELESTES/.test(q) && /WHERE/.test(q) && includes(result,'PLEIADES')) found.push('inner');
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
