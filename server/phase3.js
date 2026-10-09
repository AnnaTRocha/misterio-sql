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
    'Comece pela tabela evidencias.',
    'evidencias.id se relaciona com referencias.evidencia_id.',
    'referencias.recurso_id se relaciona com recursos.id.',
    "Filtre o recurso cujo status seja 'recuperado'.",
    'Use LEFT JOIN para incluir a evidência sem referência.'
  ],
  answer: 'PLEIADES'
};

export const PHASE_THREE_SQL = [
  { step: '3.1', objective: 'Examinar as evidências', sql: 'SELECT * FROM evidencias;' },
  { step: '3.2', objective: 'Relacionar evidências e referências', sql: 'SELECT * FROM evidencias e JOIN referencias r ON r.evidencia_id = e.id;' },
  { step: '3.3', objective: 'Relacionar evidências, referências e recursos', sql: 'SELECT * FROM evidencias e JOIN referencias r ON r.evidencia_id = e.id JOIN recursos rc ON rc.id = r.recurso_id;' },
  { step: '3.4', objective: 'Localizar o recurso recuperado', sql: "SELECT * FROM evidencias e JOIN referencias r ON r.evidencia_id = e.id JOIN recursos rc ON rc.id = r.recurso_id WHERE rc.status = 'recuperado';" },
  { step: '3.5', objective: 'Encontrar evidências sem referência', sql: 'SELECT * FROM evidencias e LEFT JOIN referencias r ON r.evidencia_id = e.id WHERE r.id IS NULL;' }
];

export function phaseThreeMilestones(query, result) {
  const cleaned = String(query || '').replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');
  const cells = result.flatMap(set => set.values.flat()).map(value => String(value ?? '').toLowerCase());
  const has = value => cells.includes(String(value).toLowerCase());
  const evidence = /\b(?:FROM|JOIN)\s+evidencias\b/i.test(cleaned);
  const references = /\b(?:FROM|JOIN)\s+referencias\b/i.test(cleaned);
  const resources = /\b(?:FROM|JOIN)\s+recursos\b/i.test(cleaned);
  const joined = /\bJOIN\b/i.test(cleaned) && /\bON\b/i.test(cleaned);
  const found = [];
  if (evidence && has('SEIS-ESTRELAS')) found.push('evidence');
  if (evidence && references && joined && has('SEIS-ESTRELAS')) found.push('evidence_join');
  if (evidence && references && resources && joined && has('SEIS-ESTRELAS')) found.push('resource_join');
  if (evidence && references && resources && joined && /\bWHERE\b/i.test(cleaned) && /\bstatus\s*=\s*['"]recuperado['"]/i.test(cleaned) && has('recuperado')) found.push('resource_found');
  if (evidence && /\bLEFT\s+JOIN\s+referencias\b/i.test(cleaned) && has('FRAGMENTO-D')) found.push('orphans');
  return found;
}
