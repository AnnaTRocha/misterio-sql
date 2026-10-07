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

    const professor = await db.query(`SELECT id FROM users WHERE LOWER(username)='professor' LIMIT 1`);
    if (!professor[0]) {
      const professorPassword = await bcrypt.hash('ihatefurry', 12);
      await db.query(
        `INSERT INTO users (username, password_hash, role) VALUES ($1, $2, 'teacher')`,
        ['professor', professorPassword]
      );
    }

    const phases = [
      [1, 'O Primeiro Acesso', 'Reative o Arquivo 3301, explore usuários e mensagens com SELECT/FROM e descubra o primeiro código de acesso.', true, true, '1987'],
      [2, '1987', 'Investigue o incidente de 17/09/1987 em seis etapas usando filtros, NULL, DISTINCT, ORDER BY, GROUP BY e agregações.', true, false, 'ORION'],
      [3, 'O Aglomerado', 'ORION ganha um novo significado: relacione evidências, referências e recursos com JOINs para recuperar um símbolo externo e descobrir o que ele representa.', false, false, 'PLÊIADES'],
      [4, 'Catálogo // Seis', 'Capítulo futuro do Observatório // 1987. O conteúdo didático será definido a partir da aula correspondente.', false, false, null],
      [5, 'Arquivo // Plêiades', 'Encerramento futuro do arco Observatório // 1987 e transição para os registros fragmentados.', false, false, null],
      [6, 'Intercepção // Nó', 'Início futuro do arco de comunicação, sessões, dispositivos e registros fragmentados.', false, false, null],
      [7, 'Registros Fragmentados', 'Capítulo futuro de cruzamento de registros e identidades dentro da Interceptação // Nó.', false, false, null],
      [8, 'Identidade // US0', 'Capítulo futuro de investigação cooperativa que conduz à identidade oculta US0.', false, false, 'US0'],
      [9, 'Operação // 3301', 'Avaliação final cooperativa. Exige os quatro marcos anteriores, totalizando 60% acumulados.', false, false, null]
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
