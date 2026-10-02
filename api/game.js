import crypto from 'node:crypto';
import { ensureProgress, ensureSchema, sql } from '../server/db.js';
import { requireUser } from '../server/auth.js';
import { action, body, fail, method } from '../server/http.js';

const ANSWER_DIGEST = '508df44321d2b2e2a04dbb185429c3343ec4bb0ca22b40dfd81c75fc5cea1695';

const PHASE_REQUIREMENTS = {
  2: ['filter', 'logic', 'special', 'order', 'distinct', 'alias', 'aggregate'],
  3: ['join']
};

export default async function handler(req, res) {
  try {
    await ensureSchema();
    const user = await requireUser(req, res, 'student');
    if (!user) return;

    const op = action(req);

    if (op === 'dashboard' && req.method === 'GET') {
      const phases = await sql().query('SELECT * FROM phases ORDER BY id');
      const progress = await sql().query(
        'SELECT * FROM progress WHERE user_id=$1 ORDER BY phase_id',
        [user.id]
      );
      return res.status(200).json({ phases, progress });
    }

    if (!method(req, res, ['POST'])) return;
    const data = body(req);

    if (op === 'start') {
      const phaseId = Number(data.phase_id);
      const phase = await availablePhase(phaseId);
      if (!phase) return fail(res, 403, 'Fase indisponível.');

      await ensureProgress(user.id, phaseId);
      await sql().query(
        `UPDATE progress SET
           status = CASE WHEN status='not_started' THEN 'in_progress' ELSE status END,
           started_at = COALESCE(started_at, NOW())
         WHERE user_id=$1 AND phase_id=$2`,
        [user.id, phaseId]
      );

      const milestones = await collectedMilestones(user.id, phaseId);
      return res.status(200).json({ phase, milestones });
    }

    if (op === 'query') {
      const phaseId = Number(data.phase_id);
      const queryText = String(data.query || '').trim();

      if (!(await availablePhase(phaseId))) return fail(res, 403, 'Fase indisponível.');
      if (!queryText || queryText.length > 5000) return fail(res, 422, 'Consulta inválida.');

      const success = data.executed === true && qualifies(phaseId, queryText);

      await ensureProgress(user.id, phaseId);
      await sql().query(
        `INSERT INTO student_queries (user_id, phase_id, query_text, success)
         VALUES ($1,$2,$3,$4)`,
        [user.id, phaseId, queryText, success]
      );
      await sql().query(
        `UPDATE progress
         SET queries_count=queries_count+1,
             attempts=attempts+CASE WHEN $1::boolean=FALSE THEN 1 ELSE 0 END
         WHERE user_id=$2 AND phase_id=$3`,
        [success, user.id, phaseId]
      );

      const milestones = await collectedMilestones(user.id, phaseId);
      return res.status(200).json({
        ok: true,
        qualifies: success,
        query_milestones: queryMilestones(phaseId, queryText),
        milestones
      });
    }

    if (op === 'complete') {
      const phaseId = Number(data.phase_id);
      const phase = await availablePhase(phaseId);
      if (!phase) return fail(res, 403, 'Fase indisponível.');

      if (phaseId === 1) {
        const normalized = normalizeName(data.answer);
        const digest = crypto.createHash('sha256').update(normalized).digest('hex');
        if (digest !== ANSWER_DIGEST) return fail(res, 422, 'Acusação incorreta.');
      } else {
        const required = PHASE_REQUIREMENTS[phaseId] || [];
        const milestones = await collectedMilestones(user.id, phaseId);
        const missing = required.filter(item => !milestones.includes(item));

        if (missing.length) {
          return fail(res, 422, `Ainda existem ${missing.length} objetivo(s) SQL incompleto(s).`);
        }
      }

      await ensureProgress(user.id, phaseId);
      await sql().query(
        `UPDATE progress SET status='completed', completed_at=COALESCE(completed_at,NOW())
         WHERE user_id=$1 AND phase_id=$2`,
        [user.id, phaseId]
      );

      return res.status(200).json({ ok: true, reward: phase.reward });
    }

    return fail(res, 400, 'Ação inválida.');
  } catch (error) {
    console.error(error);
    return fail(
      res,
      500,
      process.env.NODE_ENV === 'development' ? error.message : 'Erro interno do servidor.'
    );
  }
}

async function availablePhase(phaseId) {
  if (!Number.isInteger(phaseId) || phaseId < 1 || phaseId > 8) return null;
  const rows = await sql().query(
    'SELECT * FROM phases WHERE id=$1 AND developed=TRUE AND released=TRUE',
    [phaseId]
  );
  return rows[0] || null;
}

async function collectedMilestones(userId, phaseId) {
  if (phaseId === 1) return [];

  const rows = await sql().query(
    `SELECT query_text
     FROM student_queries
     WHERE user_id=$1 AND phase_id=$2 AND success=TRUE
     ORDER BY id`,
    [userId, phaseId]
  );

  const collected = new Set();
  for (const row of rows) {
    queryMilestones(phaseId, row.query_text).forEach(item => collected.add(item));
  }
  return [...collected];
}

function qualifies(phaseId, query) {
  const cleaned = cleanQuery(query);
  if (!isSafeReadQuery(cleaned)) return false;
  if (phaseId === 1) return true;
  return queryMilestones(phaseId, cleaned).length > 0;
}

function queryMilestones(phaseId, query) {
  const cleaned = cleanQuery(query);
  if (!isSafeReadQuery(cleaned)) return [];

  if (phaseId === 2) {
    const found = [];
    if (/\bWHERE\b/i.test(cleaned)) found.push('filter');
    if (/\b(AND|OR)\b/i.test(cleaned)) found.push('logic');
    if (/\b(LIKE|BETWEEN|NOT)\b/i.test(cleaned) || /\bIN\s*\(/i.test(cleaned) || /\bIS\s+(?:NOT\s+)?NULL\b/i.test(cleaned)) {
      found.push('special');
    }
    if (/\bORDER\s+BY\b/i.test(cleaned)) found.push('order');
    if (/\bDISTINCT\b/i.test(cleaned)) found.push('distinct');
    if (/\bAS\s+[a-z_][a-z0-9_]*\b/i.test(cleaned)) found.push('alias');
    if (/\bGROUP\s+BY\b/i.test(cleaned) && /\b(COUNT|SUM|AVG|MAX|MIN)\s*\(/i.test(cleaned)) {
      found.push('aggregate');
    }
    return [...new Set(found)];
  }

  if (phaseId === 3 && /\bJOIN\b/i.test(cleaned) && /\bON\b/i.test(cleaned)) {
    return ['join'];
  }

  return [];
}

function cleanQuery(query) {
  return String(query || '')
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();
}

function isSafeReadQuery(query) {
  return /^(SELECT|WITH|PRAGMA\s+table_info)/i.test(query) &&
    !/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|ATTACH|DETACH|VACUUM)\b/i.test(query);
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}
