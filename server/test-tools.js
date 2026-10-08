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
    { step: '3.1', objective: 'Criar setores', sql: 'CREATE TABLE setores(id INTEGER PRIMARY KEY,nome TEXT NOT NULL);' },
    { step: '3.2', objective: 'Criar observações relacionadas', sql: 'CREATE TABLE observacoes(id INTEGER PRIMARY KEY,setor_id INTEGER,FOREIGN KEY(setor_id) REFERENCES setores(id));' }
  ],
  4: [
    { step: '4.1', objective: 'Estender o catálogo', sql: 'ALTER TABLE objetos_celestes ADD COLUMN origem TEXT;' },
    { step: '4.2', objective: 'Separar observadores', sql: 'CREATE TABLE observadores(id INTEGER PRIMARY KEY,nome TEXT,telefone TEXT UNIQUE);' }
  ],
  5: [
    { step: '5.1', objective: 'Iniciar transação', sql: 'BEGIN;' },
    { step: '5.2', objective: 'Inserir registro', sql: "INSERT INTO simbolos VALUES(3,'PLEIADES',6,'confirmado');" },
    { step: '5.3', objective: 'Corrigir registro', sql: "UPDATE simbolos SET status='confirmado' WHERE nome='SUBARU';" },
    { step: '5.4', objective: 'Remover pista falsa', sql: "DELETE FROM simbolos WHERE nome='MARCA FALSA';" },
    { step: '5.5', objective: 'Confirmar transação', sql: 'COMMIT;' }
  ],
  6: [
    { step: '6.1', objective: 'Filtrar', sql: "SELECT nome FROM objetos_celestes WHERE ano=1987 AND setor='N-04';" },
    { step: '6.2', objective: 'Setores distintos', sql: 'SELECT DISTINCT setor FROM objetos_celestes;' },
    { step: '6.3', objective: 'Resumo', sql: 'SELECT ano,COUNT(*) FROM objetos_celestes GROUP BY ano ORDER BY COUNT(*) DESC;' }
  ],
  7: [
    { step: '7.1', objective: 'Relacionar acessos', sql: "SELECT o.nome FROM acessos_celestes a JOIN objetos_celestes o ON a.objeto_id=o.id WHERE a.ano=1987 AND a.status='valido';" },
    { step: '7.2', objective: 'Encontrar ausência', sql: 'SELECT o.nome FROM objetos_celestes o LEFT JOIN acessos_celestes a ON a.objeto_id=o.id WHERE a.id IS NULL;' },
    { step: '7.3', objective: 'Contar relações', sql: 'SELECT o.nome,COUNT(*) FROM acessos_celestes a JOIN objetos_celestes o ON a.objeto_id=o.id GROUP BY o.nome;' }
  ],
  8: [
    { step: '8.1', objective: 'Subconsulta', sql: 'SELECT usuario FROM acessos_celestes WHERE objeto_id IN (SELECT id FROM objetos_celestes WHERE ano=1987);' },
    { step: '8.2', objective: 'CTE', sql: 'WITH equipes AS (SELECT equipe,COUNT(*) AS total FROM investigacoes GROUP BY equipe) SELECT * FROM equipes;' },
    { step: '8.3', objective: 'Janela', sql: 'SELECT equipe,apelido,ROW_NUMBER() OVER(PARTITION BY equipe ORDER BY id) FROM investigacoes;' }
  ],
  9: [
    { step: '9.1', objective: 'Cruzar os três fragmentos', sql: 'SELECT s.grupo,s.usuario,d.usuario,i.usuario,i.codigo FROM sessoes_arg s JOIN dispositivos_arg d ON s.sessao=d.sessao AND s.grupo=d.grupo JOIN identidades_arg i ON d.dispositivo=i.dispositivo AND d.grupo=i.grupo WHERE s.grupo=1;' },
    { step: '9.2', objective: 'Revisão breve de NoSQL', sql: 'Método de consulta de documentos: find' }
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
