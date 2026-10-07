import { sql } from './db.js';

const EXPECTED_SQL = {
  1: [
    { step: '1.1', objective: 'Explorar a tabela de usuários', sql: 'SELECT * FROM usuarios;' },
    { step: '1.2', objective: 'Selecionar colunas específicas', sql: 'SELECT id, nome FROM usuarios;' },
    { step: '1.3', objective: 'Encontrar as mensagens do usuário desconhecido', sql: 'SELECT * FROM mensagens WHERE remetente_id = 3;' }
  ],
  2: [
    { step: '2.1', objective: 'Filtrar testemunha por idade e nome', sql: "SELECT * FROM pessoas WHERE idade BETWEEN 20 AND 30 AND nome LIKE 'A%';" },
    { step: '2.2', objective: 'Localizar registro com saída ausente', sql: 'SELECT * FROM acessos WHERE hora_saida IS NULL;' },
    { step: '2.3', objective: 'Listar cidades sem repetição', sql: 'SELECT DISTINCT cidade FROM pessoas;' },
    { step: '2.4', objective: 'Ordenar os acessos do mais recente', sql: 'SELECT * FROM acessos ORDER BY data_hora DESC;' },
    { step: '2.5', objective: 'Contar acessos por pessoa', sql: 'SELECT pessoa_id, COUNT(*) AS acessos FROM acessos GROUP BY pessoa_id ORDER BY acessos DESC;' },
    { step: '2.6 A', objective: 'Isolar o período e contar por usuário', sql: "SELECT usuario_id, COUNT(*) AS acessos FROM acessos WHERE data BETWEEN '1987-09-17' AND '1987-09-21' GROUP BY usuario_id ORDER BY acessos DESC;" },
    { step: '2.6 B', objective: 'Consultar o usuário identificado', sql: 'SELECT * FROM usuarios WHERE id = 37;' }
  ],
  3: [
    { step: '3.1', objective: 'Examinar as evidências', sql: 'SELECT * FROM evidencias;' },
    { step: '3.2', objective: 'Relacionar evidências e referências', sql: 'SELECT * FROM evidencias e JOIN referencias r ON r.evidencia_id = e.id;' },
    { step: '3.3', objective: 'Relacionar evidências, referências e recursos', sql: 'SELECT * FROM evidencias e JOIN referencias r ON r.evidencia_id = e.id JOIN recursos rc ON rc.id = r.recurso_id;' },
    { step: '3.4', objective: 'Localizar o recurso recuperado', sql: "SELECT * FROM evidencias e JOIN referencias r ON r.evidencia_id = e.id JOIN recursos rc ON rc.id = r.recurso_id WHERE rc.status = 'recuperado';" },
    { step: '3.5', objective: 'Encontrar evidências sem referência', sql: 'SELECT * FROM evidencias e LEFT JOIN referencias r ON r.evidencia_id = e.id;' }
  ]
};

export function expectedSqlForPhase(phaseId) {
  return EXPECTED_SQL[Number(phaseId)] || [];
}

export async function resetTestActivity(userId, phaseId) {
  const normalizedPhase = Number(phaseId);
  if (!Number.isInteger(normalizedPhase) || normalizedPhase < 1 || normalizedPhase > 9) return false;

  const db = sql();

  await db.query('DELETE FROM student_queries WHERE user_id=$1 AND phase_id=$2', [userId, normalizedPhase]);
  await db.query('DELETE FROM progress WHERE user_id=$1 AND phase_id=$2', [userId, normalizedPhase]);

  if (normalizedPhase === 3) {
    await db.query('DELETE FROM phase3_queries WHERE user_id=$1', [userId]);
    await db.query('DELETE FROM phase3_progress WHERE user_id=$1', [userId]);
  }

  await db.query(
    `DELETE FROM arg_submissions
     WHERE user_id=$1
       AND assessment_id IN (
         SELECT id FROM course_assessments
         WHERE $2 BETWEEN phase_start AND phase_end
       )`,
    [userId, normalizedPhase]
  );

  if (normalizedPhase === 9) {
    await db.query(
      `UPDATE arg_state
       SET final_protocol_unlocked=FALSE, updated_at=NOW()
       WHERE user_id=$1`,
      [userId]
    );
  }

  return true;
}
