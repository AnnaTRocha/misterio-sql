import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

let sqlClient;
let initialized = false;
let initPromise;

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

    await db(`CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      username VARCHAR(30) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(10) NOT NULL DEFAULT 'student' CHECK (role IN ('teacher','student')),
      must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login_at TIMESTAMPTZ
    )`);

    await db(`CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_unique ON users (LOWER(username))`);

    await db(`CREATE TABLE IF NOT EXISTS phases (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      developed BOOLEAN NOT NULL DEFAULT FALSE,
      released BOOLEAN NOT NULL DEFAULT FALSE,
      reward TEXT
    )`);

    await db(`CREATE TABLE IF NOT EXISTS progress (
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

    await db(`CREATE TABLE IF NOT EXISTS student_queries (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      phase_id INTEGER NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
      query_text TEXT NOT NULL,
      success BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

    await db(`CREATE TABLE IF NOT EXISTS password_reset_requests (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    )`);

    await db(`CREATE UNIQUE INDEX IF NOT EXISTS one_pending_reset_per_user
      ON password_reset_requests(user_id) WHERE status = 'pending'`);

    const professor = await db(`SELECT id FROM users WHERE LOWER(username)='professor' LIMIT 1`);
    if (!professor[0]) {
      const professorPassword = await bcrypt.hash('ihatefurry', 12);
      await db(
        `INSERT INTO users (username, password_hash, role) VALUES ($1, $2, 'teacher')`,
        ['professor', professorPassword]
      );
    }

    const phases = [
      [1, 'O notebook desaparecido', 'Investigue o caso atual usando consultas SQL.', true, true, 'ARQUIVO-18'],
      [2, 'Filtrando evidências', 'Use WHERE e filtros para reduzir os registros até encontrar evidências úteis.', true, false, 'FILTRO-26'],
      [3, 'Conectando as evidências', 'Relacione tabelas usando JOIN e ON para cruzar pessoas, acessos e veículos.', true, false, 'CHAVE-JOIN'],
      [4, 'Fase 4', 'Ainda não desenvolvido.', false, false, null],
      [5, 'Fase 5', 'Ainda não desenvolvido.', false, false, null],
      [6, 'Fase 6', 'Ainda não desenvolvido.', false, false, null],
      [7, 'Fase 7', 'Ainda não desenvolvido.', false, false, null],
      [8, 'Fase 8', 'Ainda não desenvolvido.', false, false, null]
    ];

    for (const phase of phases) {
      await db(
        `INSERT INTO phases (id, title, description, developed, released, reward)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO NOTHING`,
        phase
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
  await db(
    `INSERT INTO progress (user_id, phase_id, status)
     VALUES ($1, $2, 'not_started')
     ON CONFLICT (user_id, phase_id) DO NOTHING`,
    [userId, phaseId]
  );
}
