import { sql } from './db.js';

const PHASE_ID = 3;
const PHASE = {
  id: PHASE_ID,
  title: 'O Aglomerado',
  description: 'Relacione evidências, referências e recursos com JOINs para recuperar um símbolo externo e descobrir o que ele representa.',
  reward: 'PLÊIADES'
};

export async function ensurePhaseThree() {
  const db = sql();

  await db.query(`CREATE TABLE IF NOT EXISTS phase3_progress (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'not_started',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    attempts INTEGER NOT NULL DEFAULT 0,
    queries_count INTEGER NOT NULL DEFAULT 0
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS phase3_queries (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  const setting = await db.query(
    `SELECT value FROM app_meta WHERE key='phase_3_released' LIMIT 1`
  );
  const released = setting[0]?.value === 'true';

  await db.query(
    `INSERT INTO phases (id, title, description, developed, released, reward)
     VALUES ($1,$2,$3,TRUE,$4,$5)
     ON CONFLICT (id) DO UPDATE SET
       title=EXCLUDED.title,
       description=EXCLUDED.description,
       developed=TRUE,
       released=EXCLUDED.released,
       reward=EXCLUDED.reward`,
    [PHASE.id, PHASE.title, PHASE.description, released, PHASE.reward]
  );
}

export async function ensurePhaseThreeProgress(userId) {
  await sql().query(
    `INSERT INTO phase3_progress (user_id, status)
     VALUES ($1, 'not_started')
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
}

export async function startPhaseThree(userId) {
  await ensurePhaseThreeProgress(userId);
  await sql().query(
    `UPDATE phase3_progress SET
       status=CASE WHEN status='not_started' THEN 'in_progress' ELSE status END,
       started_at=COALESCE(started_at,NOW())
     WHERE user_id=$1`,
    [userId]
  );
}

export async function logPhaseThreeQuery(userId, queryText, success) {
  await ensurePhaseThreeProgress(userId);
  const db = sql();
  await db.query(
    `INSERT INTO phase3_queries (user_id, query_text, success)
     VALUES ($1,$2,$3)`,
    [userId, queryText, success]
  );
  await db.query(
    `UPDATE phase3_progress
     SET queries_count=queries_count+1,
         attempts=attempts+CASE WHEN $1::boolean=FALSE THEN 1 ELSE 0 END
     WHERE user_id=$2`,
    [success, userId]
  );
}

export async function phaseThreeQueries(userId) {
  return sql().query(
    `SELECT query_text
     FROM phase3_queries
     WHERE user_id=$1 AND success=TRUE
     ORDER BY id`,
    [userId]
  );
}

export async function phaseThreeProgress(userId) {
  const rows = await sql().query(
    `SELECT user_id, 3 AS phase_id, status, started_at, completed_at, attempts, queries_count
     FROM phase3_progress WHERE user_id=$1`,
    [userId]
  );
  return rows[0] || null;
}

export async function completePhaseThree(userId) {
  await ensurePhaseThreeProgress(userId);
  await sql().query(
    `UPDATE phase3_progress
     SET status='completed', completed_at=COALESCE(completed_at,NOW())
     WHERE user_id=$1`,
    [userId]
  );
}

export async function setPhaseThreeReleased(released) {
  const db = sql();
  await db.query(
    `INSERT INTO app_meta (key, value) VALUES ('phase_3_released', $1)
     ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`,
    [released ? 'true' : 'false']
  );
  await db.query('UPDATE phases SET released=$1 WHERE id=3', [released]);
}

export async function phaseThreeOverview() {
  const rows = await sql().query(`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('in_progress','completed'))::int AS started,
      COUNT(*) FILTER (WHERE status='completed')::int AS completed
    FROM phase3_progress
  `);
  return rows[0] || { started: 0, completed: 0 };
}

export async function phaseThreeStudentStats() {
  return sql().query(`
    SELECT user_id, queries_count::int AS queries, attempts::int AS attempts,
      CASE WHEN status='completed' THEN 1 ELSE 0 END::int AS completed
    FROM phase3_progress
  `);
}
