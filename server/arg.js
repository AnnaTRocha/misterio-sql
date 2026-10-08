import { sql } from './db.js';

let initialized = false;
let initPromise;

const ASSESSMENTS = [
  ...Array.from({ length: 8 }, (_, index) => [index + 1, `Exercício ${String(index + 1).padStart(2, '0')}`, index + 1, index + 1, 7.5, false]),
  [9, 'Exercício 09', 9, 9, 40, true]
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
    weight NUMERIC(5,2) NOT NULL CHECK (weight > 0 AND weight <= 100),
    is_final BOOLEAN NOT NULL DEFAULT FALSE
  )`);

  await db.query('ALTER TABLE course_assessments ALTER COLUMN weight TYPE NUMERIC(5,2)');

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

  await db.query(`
    UPDATE arg_identities ai
    SET group_id=NULL
    FROM users u
    WHERE ai.user_id=u.id AND u.role='student' AND u.is_test=TRUE
  `);

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
      try {
        await db.query(
          `INSERT INTO arg_identities (user_id, alias, group_id)
           VALUES ($1,$2,NULL)
           ON CONFLICT (user_id) DO NOTHING`,
          [student.id, alias]
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

  await assignUngroupedStudents();
}

async function assignUngroupedStudents() {
  const db = sql();
  const counts = await db.query(`
    SELECT ai.group_id, COUNT(*)::int AS total
    FROM arg_identities ai
    JOIN users u ON u.id=ai.user_id
    WHERE u.role='student' AND u.is_test=FALSE AND ai.group_id IN (1,2)
    GROUP BY ai.group_id
  `);
  const totals = { 1: 0, 2: 0 };
  for (const row of counts) totals[Number(row.group_id)] = Number(row.total);

  const students = await db.query(`
    SELECT ai.id
    FROM arg_identities ai
    JOIN users u ON u.id=ai.user_id
    WHERE u.role='student' AND u.is_test=FALSE AND ai.group_id IS NULL
    ORDER BY u.username, u.id
  `);

  for (const student of students) {
    const groupId = totals[1] <= totals[2] ? 1 : 2;
    await db.query('UPDATE arg_identities SET group_id=$1 WHERE id=$2', [groupId, student.id]);
    totals[groupId] += 1;
  }
}

export async function setStudentTestStatus(userId, isTest) {
  const db = sql();
  const rows = await db.query(
    `UPDATE users SET is_test=$1
     WHERE id=$2 AND role='student'
     RETURNING id`,
    [Boolean(isTest), userId]
  );
  if (!rows[0]) return false;

  if (isTest) {
    await db.query('UPDATE arg_identities SET group_id=NULL WHERE user_id=$1', [userId]);
  } else {
    await assignUngroupedStudents();
  }
  return true;
}

export async function reorganizeGroups() {
  const db = sql();

  await db.query(`
    UPDATE arg_identities ai
    SET group_id=NULL
    FROM users u
    WHERE ai.user_id=u.id AND u.role='student' AND u.is_test=TRUE
  `);

  const students = await db.query(`
    SELECT ai.id
    FROM arg_identities ai
    JOIN users u ON u.id=ai.user_id
    WHERE u.role='student' AND u.is_test=FALSE
    ORDER BY u.username, u.id
  `);

  for (let index = 0; index < students.length; index += 1) {
    const groupId = index % 2 === 0 ? 1 : 2;
    await db.query('UPDATE arg_identities SET group_id=$1 WHERE id=$2', [groupId, students[index].id]);
  }

  const testRows = await db.query(`SELECT COUNT(*)::int AS total FROM users WHERE role='student' AND is_test=TRUE`);
  return {
    group_1: Math.ceil(students.length / 2),
    group_2: Math.floor(students.length / 2),
    test_users: Number(testRows[0]?.total || 0)
  };
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

  return map;
}
