export const PHASE_THREE = {
  title: 'O Aglomerado', code: 'OBSERVATÓRIO // 1987', theme: 'observatory',
  mission: 'Relacione evidências, referências e recursos para recuperar o símbolo de seis estrelas.',
  answerPrompt: 'Abra o recurso recuperado. O que representa o símbolo de seis estrelas?',
  initial: 'SELECT * FROM evidencias;',
  tables: ['evidencias', 'referencias', 'recursos'],
  objectives: [
    ['evidence', 'Examinar as evidências recuperadas'],
    ['evidence_join', 'Relacionar evidências e referências'],
    ['resource_join', 'Relacionar referências e recursos'],
    ['resource_found', 'Localizar o recurso externo recuperado'],
    ['orphans', 'Identificar evidências sem referência usando LEFT JOIN']
  ],
  hints: [
    'Comece pelas evidências e observe os códigos encontrados.',
    'Uma referência aponta para uma evidência.',
    'Cada referência também pode apontar para um recurso.',
    'Nem todo recurso está disponível; observe o status.',
    'A ausência de correspondência também é uma pista.'
  ],
  answer: 'PLEIADES'
};

export const PHASE_THREE_SQL = [
  { step: '3.1', objective: 'Examinar as evidências recuperadas', sql: 'SELECT * FROM evidencias;' },
  { step: '3.2', objective: 'Relacionar evidências e referências', sql: 'SELECT * FROM evidencias e JOIN referencias r ON r.evidencia_id = e.id;' },
  { step: '3.3', objective: 'Relacionar referências e recursos', sql: 'SELECT * FROM referencias r JOIN recursos rc ON rc.id = r.recurso_id;' },
  { step: '3.4', objective: 'Localizar o recurso externo recuperado', sql: "SELECT rc.endereco FROM referencias r JOIN recursos rc ON rc.id = r.recurso_id WHERE rc.status = 'recuperado';" },
  { step: '3.5', objective: 'Identificar evidências sem referência usando LEFT JOIN', sql: 'SELECT e.codigo FROM evidencias e LEFT JOIN referencias r ON r.evidencia_id = e.id WHERE r.id IS NULL;' }
];

export function phaseThreeMilestones(query, result) {
  const cleaned = String(query || '').replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/["`]/g, '').replace(/\s+/g, ' ');
  const structure = cleaned.replace(/'(?:''|[^'])*'/g, "''").replace(/\(\s*([a-z_]\w*\s*\.\s*[a-z_]\w*)\s*\)/gi, '$1');
  const rows = result.flatMap(set => set.values);
  const cells = rows.flat().map(value => String(value ?? '').toLowerCase());
  const has = value => cells.includes(String(value).toLowerCase());
  const aliases = new Map();
  for (const match of structure.matchAll(/(?:\bFROM\b|\bJOIN\b|,)\s+(evidencias|referencias|recursos)\b(?:\s+(?:AS\s+)?(?!ON\b|WHERE\b|JOIN\b|LEFT\b|INNER\b|RIGHT\b|OUTER\b|ORDER\b|GROUP\b|LIMIT\b|CROSS\b|HAVING\b|UNION\b|USING\b)([a-z_]\w*))?/gi)) {
    aliases.set(match[1].toLowerCase(), match[2] || match[1]);
  }
  const uses = name => aliases.has(name);
  const column = (table, name) => `${aliases.get(table)}\\s*\\.\\s*${name}`;
  const relation = (left, right) => new RegExp(`(?:${left}\\s*=\\s*${right}|${right}\\s*=\\s*${left})`, 'i').test(structure);
  const evidenceRelation = uses('evidencias') && uses('referencias') && relation(column('evidencias', 'id'), column('referencias', 'evidencia_id'));
  const resourceRelation = uses('referencias') && uses('recursos') && relation(column('referencias', 'recurso_id'), column('recursos', 'id'));
  const leftEvidenceJoin = /\bLEFT\s+(?:OUTER\s+)?JOIN\s+referencias\b/i.test(structure);
  const found = [];
  if (uses('evidencias') && has('SEIS-ESTRELAS')) found.push('evidence');
  if (evidenceRelation && rows.length > 0) found.push('evidence_join');
  if (resourceRelation && rows.length > 0) found.push('resource_join');
  if (uses('recursos') && rows.length === 1 && cells.some(value => value.startsWith('https://'))) found.push('resource_found');
  if (evidenceRelation && leftEvidenceJoin && rows.length === 1 && (has('FRAGMENTO-D') || has(4))) found.push('orphans');
  return found;
}
