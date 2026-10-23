export const PHASE_THREE = {
  title: 'O Aglomerado', code: 'OBSERVATÓRIO // 1987', theme: 'blueprint',
  mission: 'Relacione evidências, referências e recursos para identificar a marca associada ao símbolo de seis estrelas.',
  answerPrompt: 'Qual marca está identificada no registro ligado ao símbolo de seis estrelas?',
  initial: 'SELECT * FROM evidencias;',
  tables: ['evidencias', 'referencias', 'recursos'],
  objectives: [
    ['evidence', '3.1 // Consultar evidencias e localizar o código SEIS-ESTRELAS'],
    ['evidence_join', '3.2 // Relacionar evidencias e referencias por id_evidencia = evidencia_id'],
    ['resource_join', '3.3 // Relacionar referencias e recursos por recurso_id = id_recurso'],
    ['resource_found', '3.4 // Localizar em recursos o endereco cujo status é recuperado'],
    ['orphans', '3.5 // Usar LEFT JOIN para encontrar a evidência sem referência correspondente']
  ],
  hints: [
    'Comece pelas evidências e observe os códigos encontrados.',
    'Uma referência aponta para uma evidência.',
    'Cada referência também pode apontar para um recurso.',
    'Nem todo recurso está disponível. Observe o status de cada um.',
    'A ausência de correspondência também é uma pista.'
  ],
  answer: 'SUBARU'
};

export const PHASE_THREE_SQL = [
  { step: '3.1', objective: '3.1 // Consultar evidencias e localizar o código SEIS-ESTRELAS', sql: 'SELECT * FROM evidencias;' },
  { step: '3.2', objective: '3.2 // Relacionar evidencias e referencias por id_evidencia = evidencia_id', sql: 'SELECT * FROM evidencias e JOIN referencias r ON r.evidencia_id = e.id_evidencia;' },
  { step: '3.3', objective: '3.3 // Relacionar referencias e recursos por recurso_id = id_recurso', sql: 'SELECT * FROM referencias r JOIN recursos rc ON rc.id_recurso = r.recurso_id;' },
  { step: '3.4', objective: '3.4 // Localizar em recursos o endereco cujo status é recuperado', sql: "SELECT rc.endereco FROM referencias r JOIN recursos rc ON rc.id_recurso = r.recurso_id WHERE rc.status = 'recuperado';" },
  { step: '3.5', objective: '3.5 // Usar LEFT JOIN para encontrar a evidência sem referência correspondente', sql: 'SELECT e.codigo FROM evidencias e LEFT JOIN referencias r ON r.evidencia_id = e.id_evidencia WHERE r.id_referencia IS NULL;' }
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
  const evidenceRelation = uses('evidencias') && uses('referencias') && relation(column('evidencias', 'id_evidencia'), column('referencias', 'evidencia_id'));
  const resourceRelation = uses('referencias') && uses('recursos') && relation(column('referencias', 'recurso_id'), column('recursos', 'id_recurso'));
  const leftEvidenceJoin = /\bLEFT\s+(?:OUTER\s+)?JOIN\s+referencias\b/i.test(structure);
  const found = [];
  if (uses('evidencias') && has('SEIS-ESTRELAS')) found.push('evidence');
  if (evidenceRelation && rows.length > 0) found.push('evidence_join');
  if (resourceRelation && rows.length > 0) found.push('resource_join');
  if (uses('recursos') && rows.length === 1 && cells.some(value => value.startsWith('https://'))) found.push('resource_found');
  if (evidenceRelation && leftEvidenceJoin && /\bWHERE\s+(?:\w+\s*\.\s*)?(?:id_referencia|evidencia_id)\s+IS\s+NULL\b/i.test(structure)
    && rows.length === 1 && (has('FRAGMENTO-D') || has(4))) found.push('orphans');
  return found;
}
