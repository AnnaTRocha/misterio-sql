import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

let sqlClient;
let initialized = false;
let initPromise;

const STORY_VERSION = 'arquivo-3301-v1';

export function sql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não configurada.');
  }
  if (!sqlClient) sqlClient = neon(process.env.DATABASE_URL);
  return sqlClient;
}

export async function ensureSchema() {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const db = sql();

    await db.query(`CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      username VARCHAR(30) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(10) NOT NULL DEFAULT 'student' CHECK (role IN ('teacher','student')),
      must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login_at TIMESTAMPTZ
    )`);

    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT FALSE`);

    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_unique ON users (LOWER(username))`);

    await db.query(`CREATE TABLE IF NOT EXISTS phases (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      developed BOOLEAN NOT NULL DEFAULT FALSE,
      released BOOLEAN NOT NULL DEFAULT FALSE,
      reward TEXT
    )`);

    await db.query(`CREATE TABLE IF NOT EXISTS progress (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      phase_id INTEGER NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'not_started',
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      attempts INTEGER NOT NULL DEFAULT 0,
      queries_count INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, phase_id)
    )`);

    await db.query(`CREATE TABLE IF NOT EXISTS student_queries (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      phase_id INTEGER NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
      query_text TEXT NOT NULL,
      success BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

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

    await db.query(`CREATE TABLE IF NOT EXISTS password_reset_requests (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    )`);

    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS one_pending_reset_per_user
      ON password_reset_requests(user_id) WHERE status = 'pending'`);

    await db.query(`CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`);

    const professor = await db.query(`SELECT id, password_hash FROM users WHERE LOWER(username)='professor' LIMIT 1`);
    if (!professor[0]) {
      const initialPassword = process.env.TEACHER_INITIAL_PASSWORD;
      if (initialPassword && initialPassword.length >= 12) {
        const professorPassword = await bcrypt.hash(initialPassword, 12);
        await db.query(
          `INSERT INTO users (username, password_hash, role, must_change_password) VALUES ($1, $2, 'teacher', TRUE)`,
          ['professor', professorPassword]
        );
      } else {
        console.warn('Conta do professor pendente: configure TEACHER_INITIAL_PASSWORD.');
      }
    }

    const phases = [
      [1, 'O Primeiro Acesso', 'Reative o Arquivo 3301, explore usuários e mensagens com SELECT/FROM e descubra o primeiro código de acesso.', true, true, '1987'],
      [2, 'O Registro Interrompido', 'Reconstrua o incidente por meio de filtros, ausências, ordenação e agregações.', true, false, 'ORION'],
      [3, 'O Aglomerado', 'Relacione evidências, referências e recursos com JOINs para recuperar o símbolo de seis estrelas.', true, false, 'PLEIADES'],
      [4, 'O Padrão Quebrado', 'Há registros repetidos no observatório. Descubra o que está fora do lugar.', true, false, 'NORMALIZACAO'],
      [5, 'A Sexta Estrela', 'Uma marca apagada e uma estrela ausente alteram a leitura do arquivo.', true, false, 'PLEIADES'],
      [6, 'Eco no Setor Norte', 'Os sinais de 1987 foram misturados a ruído. Separe o que importa.', true, false, 'N-04'],
      [7, 'Linhas Cruzadas', 'As respostas estão em registros que não foram guardados juntos.', true, false, 'PLEIADES'],
      [8, 'O Sétimo Rastro', 'As sessões deixam padrões que só aparecem quando vistas em conjunto.', true, false, 'FRAGMENTOS'],
      [9, 'Última Transmissão', 'Três fragmentos, uma identidade ausente e um protocolo final.', true, false, 'US0']
    ];

    for (const phase of phases) {
      await db.query(
        `INSERT INTO phases (id, title, description, developed, released, reward)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO UPDATE SET
           title=EXCLUDED.title,
           description=EXCLUDED.description,
           developed=EXCLUDED.developed,
           reward=EXCLUDED.reward`,
        phase
      );
    }


    const storyVersion = await db.query(`SELECT value FROM app_meta WHERE key='story_version' LIMIT 1`);
    if (storyVersion[0]?.value !== STORY_VERSION) {
      await db.query(`DELETE FROM student_queries`);
      await db.query(`DELETE FROM progress`);
      await db.query(
        `INSERT INTO app_meta (key, value) VALUES ('story_version', $1)
         ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`,
        [STORY_VERSION]
      );
    }

    await db.query(`INSERT INTO progress (user_id,phase_id,status,started_at,completed_at,attempts,queries_count)
      SELECT user_id,3,status,started_at,completed_at,attempts,queries_count FROM phase3_progress WHERE TRUE
      ON CONFLICT (user_id,phase_id) DO NOTHING`);
    await db.query(`UPDATE progress p SET status=CASE
        WHEN old.status='completed' THEN 'completed'
        WHEN old.status='in_progress' AND p.status='not_started' THEN 'in_progress'
        ELSE p.status END,
      started_at=COALESCE(p.started_at,old.started_at),
      completed_at=CASE WHEN old.status='completed'
        THEN COALESCE(p.completed_at,old.completed_at,NOW()) ELSE p.completed_at END,
      attempts=GREATEST(p.attempts,old.attempts),
      queries_count=GREATEST(p.queries_count,old.queries_count)
      FROM phase3_progress old
      WHERE p.user_id=old.user_id AND p.phase_id=3`);

    initialized = true;
  })();

  try {
    await initPromise;
  } finally {
    initPromise = null;
  }
}

export async function ensureProgress(userId, phaseId) {
  const db = sql();
  await db.query(
    `INSERT INTO progress (user_id, phase_id, status)
     VALUES ($1, $2, 'not_started')
     ON CONFLICT (user_id, phase_id) DO NOTHING`,
    [userId, phaseId]
  );
}
