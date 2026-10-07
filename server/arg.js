import { sql } from './db.js';

let initialized = false;
let initPromise;

const ASSESSMENTS = [
  [1, 'Exercício 01', 1, 2, 15, false],
  [2, 'Exercício 02', 3, 4, 15, false],
  [3, 'Exercício 03', 5, 6, 15, false],
  [4, 'Exercício 04', 7, 8, 15, false],
  [5, 'Exercício 05', 9, 9, 40, true]
];

export async function ensureArgFoundation() {
  if (!initialized) {
    if (!initPromise) initPromise = initializeFoundation();
    try {
      await initPromise;
      initialized = true;
    } finally {
      initPromise = null;
    }
  }

  await assignStudentIdentities();
}

async function initializeFoundation() {
  const db = sql();

  await db.query(`CREATE TABLE IF NOT EXISTS arg_groups (
    id INTEGER PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name TEXT NOT NULL
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS arg_identities (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    alias VARCHAR(30) NOT NULL UNIQUE,
    group_id INTEGER REFERENCES arg_groups(id),
    is_secret BOOLEAN NOT NULL DEFAULT FALSE,
    visible BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS course_assessments (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    phase_start INTEGER NOT NULL,
    phase_end INTEGER NOT NULL,
    weight INTEGER NOT NULL CHECK (weight > 0 AND weight <= 100),
    is_final BOOLEAN NOT NULL DEFAULT FALSE
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS arg_secret_hints (
    group_id INTEGER PRIMARY KEY REFERENCES arg_groups(id) ON DELETE CASCADE,
    code VARCHAR(40) NOT NULL,
    message TEXT NOT NULL
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS arg_logs (
    id BIGSERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES arg_groups(id),
    identity_alias VARCHAR(30),
    occurred_at TIMESTAMPTZ,
    kind TEXT,
    source TEXT,
    destination TEXT,
    reference TEXT,
    message TEXT
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS arg_external_resources (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    resource_type VARCHAR(30) NOT NULL,
    url TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active'
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS arg_submissions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assessment_id INTEGER REFERENCES course_assessments(id),
    answer TEXT,
    correct BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS arg_state (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    us0_discovered BOOLEAN NOT NULL DEFAULT FALSE,
    final_protocol_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  await db.query(`INSERT INTO arg_groups (id, code, name) VALUES
    (1, 'GRUPO 01', 'Equipe de investigação 01'),
    (2, 'GRUPO 02', 'Equipe de investigação 02')
    ON CONFLICT (id) DO UPDATE SET code=EXCLUDED.code, name=EXCLUDED.name`);

  for (const assessment of ASSESSMENTS) {
    await db.query(
      `INSERT INTO course_assessments (id,title,phase_start,phase_end,weight,is_final)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET
         title=EXCLUDED.title,
         phase_start=EXCLUDED.phase_start,
         phase_end=EXCLUDED.phase_end,
         weight=EXCLUDED.weight,
         is_final=EXCLUDED.is_final`,
      assessment
    );
  }

  await db.query(`INSERT INTO arg_secret_hints (group_id, code, message) VALUES
    (1, 'HINT-G1', 'Nem todos os registros precisam ser lidos na ordem em que foram encontrados.'),
    (2, 'HINT-G2', 'A última informação pode não estar no banco. Procure onde os registros apontam.')
    ON CONFLICT (group_id) DO UPDATE SET code=EXCLUDED.code, message=EXCLUDED.message`);

  await db.query(
    `INSERT INTO arg_external_resources (code, resource_type, url, status)
     VALUES ('SUBARU-1999', 'image', $1, 'active')
     ON CONFLICT (code) DO UPDATE SET url=EXCLUDED.url, status=EXCLUDED.status`,
    ['https://1000logos.net/wp-content/uploads/2018/03/Subaru-Logo-1999.jpg']
  );

  await db.query(`INSERT INTO arg_identities (user_id, alias, group_id, is_secret, visible)
    VALUES (NULL, 'us0', NULL, TRUE, FALSE)
    ON CONFLICT (alias) DO UPDATE SET is_secret=TRUE, visible=FALSE`);
}

async function assignStudentIdentities() {
  const db = sql();
  const aliases = await db.query(`SELECT alias FROM arg_identities WHERE alias ~ '^us[0-9]+$'`);
  let next = aliases.reduce((max, row) => {
    const value = Number(String(row.alias).slice(2));
    return Number.isInteger(value) ? Math.max(max, value) : max;
  }, 0) + 1;

  const students = await db.query(`
    SELECT u.id
    FROM users u
    LEFT JOIN arg_identities ai ON ai.user_id=u.id
    WHERE u.role='student' AND ai.user_id IS NULL
    ORDER BY u.id
  `);

  for (const student of students) {
    let assigned = false;
    while (!assigned) {
      const alias = `us${next}`;
      const groupId = Math.floor((next - 1) / 3) % 2 + 1;
      try {
        await db.query(
          `INSERT INTO arg_identities (user_id, alias, group_id)
           VALUES ($1,$2,$3)
           ON CONFLICT (user_id) DO NOTHING`,
          [student.id, alias, groupId]
        );
        assigned = true;
      } catch (error) {
        if (!String(error.message).toLowerCase().includes('unique')) throw error;
        const existing = await db.query('SELECT id FROM arg_identities WHERE user_id=$1 LIMIT 1', [student.id]);
        assigned = Boolean(existing[0]);
      }
      next += 1;
    }
  }
}

export async function argIdentityForUser(userId) {
  const rows = await sql().query(`
    SELECT ai.alias, ai.group_id, ag.code AS group_code, ag.name AS group_name
    FROM arg_identities ai
    LEFT JOIN arg_groups ag ON ag.id=ai.group_id
    WHERE ai.user_id=$1
    LIMIT 1
  `, [userId]);
  return rows[0] || null;
}

export async function assessmentSummary(userId) {
  const completed = await completedPhaseMap([userId]);
  const phases = completed.get(Number(userId)) || new Set();
  const assessments = ASSESSMENTS.map(([id, title, start, end, weight, isFinal]) => {
    const required = [];
    for (let phase = start; phase <= end; phase += 1) required.push(phase);
    const done = required.every(phase => phases.has(phase));
    return { id, title, phase_start: start, phase_end: end, weight, is_final: isFinal, completed: done };
  });
  const score = assessments.reduce((sum, item) => sum + (item.completed ? item.weight : 0), 0);
  const baseScore = assessments
    .filter(item => !item.is_final)
    .reduce((sum, item) => sum + (item.completed ? item.weight : 0), 0);
  const finalProtocolUnlocked = await isFinalProtocolUnlocked(userId);
  return {
    assessments,
    score,
    final_eligible: baseScore >= 60,
    final_protocol_unlocked: finalProtocolUnlocked
  };
}

export async function assessmentScores(userIds) {
  const normalized = [...new Set(userIds.map(Number).filter(Number.isInteger))];
  const result = new Map(normalized.map(id => [id, 0]));
  if (!normalized.length) return result;

  const completed = await completedPhaseMap(normalized);
  for (const userId of normalized) {
    const phases = completed.get(userId) || new Set();
    let score = 0;
    for (const [, , start, end, weight] of ASSESSMENTS) {
      let done = true;
      for (let phase = start; phase <= end; phase += 1) {
        if (!phases.has(phase)) {
          done = false;
          break;
        }
      }
      if (done) score += weight;
    }
    result.set(userId, score);
  }
  return result;
}

export async function unlockFinalProtocol(userId, protocol) {
  const completed = await completedPhaseMap([userId]);
  const phases = completed.get(Number(userId)) || new Set();
  const previousWeight = ASSESSMENTS
    .filter(item => !item[5])
    .reduce((sum, [, , start, end, weight]) => {
      let done = true;
      for (let phase = start; phase <= end; phase += 1) {
        if (!phases.has(phase)) {
          done = false;
          break;
        }
      }
      return sum + (done ? weight : 0);
    }, 0);

  if (previousWeight < 60 || String(protocol || '').trim() !== '3301') return false;

  await sql().query(
    `INSERT INTO arg_state (user_id, final_protocol_unlocked, updated_at)
     VALUES ($1, TRUE, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       final_protocol_unlocked=TRUE,
       updated_at=NOW()`,
    [userId]
  );
  return true;
}

async function isFinalProtocolUnlocked(userId) {
  const rows = await sql().query(
    'SELECT final_protocol_unlocked FROM arg_state WHERE user_id=$1 LIMIT 1',
    [userId]
  );
  return Boolean(rows[0]?.final_protocol_unlocked);
}

async function completedPhaseMap(userIds) {
  const db = sql();
  const map = new Map(userIds.map(id => [Number(id), new Set()]));

  const regular = await db.query(
    `SELECT user_id, phase_id FROM progress
     WHERE status='completed' AND user_id = ANY($1::bigint[])`,
    [userIds]
  );
  for (const row of regular) {
    const id = Number(row.user_id);
    if (!map.has(id)) map.set(id, new Set());
    map.get(id).add(Number(row.phase_id));
  }

  const phaseThreeExists = await db.query(`SELECT to_regclass('public.phase3_progress') AS table_name`);
  if (phaseThreeExists[0]?.table_name) {
    const phaseThree = await db.query(
      `SELECT user_id FROM phase3_progress
       WHERE status='completed' AND user_id = ANY($1::bigint[])`,
      [userIds]
    );
    for (const row of phaseThree) {
      const id = Number(row.user_id);
      if (!map.has(id)) map.set(id, new Set());
      map.get(id).add(3);
    }
  }

  return map;
}
