import crypto from 'node:crypto';
import { ensureProgress, ensureSchema, sql } from '../server/db.js';
import { requireUser } from '../server/auth.js';
import { action, body, fail, method } from '../server/http.js';

const ANSWER_DIGEST = '508df44321d2b2e2a04dbb185429c3343ec4bb0ca22b40dfd81c75fc5cea1695';

export default async function handler(req, res) {
  try {
    await ensureSchema();
    const user = await requireUser(req, res, 'student');
    if (!user) return;
    const op = action(req);

    if (op === 'dashboard' && req.method === 'GET') {
      const phases = await sql()('SELECT * FROM phases ORDER BY id');
      const progress = await sql()('SELECT * FROM progress WHERE user_id=$1 ORDER BY phase_id', [user.id]);
      return res.status(200).json({ phases, progress });
    }

    if (!method(req, res, ['POST'])) return;
    const data = body(req);

    if (op === 'start') {
      const phaseId = Number(data.phase_id);
      const phase = await availablePhase(phaseId);
      if (!phase) return fail(res, 403, 'Fase indisponível.');
      await ensureProgress(user.id, phaseId);
      await sql()(
        `UPDATE progress SET
           status = CASE WHEN status='not_started' THEN 'in_progress' ELSE status END,
           started_at = COALESCE(started_at, NOW())
         WHERE user_id=$1 AND phase_id=$2`,
        [user.id, phaseId]
      );
      return res.status(200).json({ phase });
    }

    if (op === 'query') {
      const phaseId = Number(data.phase_id);
      const queryText = String(data.query || '').trim();
      if (!(await availablePhase(phaseId))) return fail(res, 403, 'Fase indisponível.');
      if (!queryText || queryText.length > 5000) return fail(res, 422, 'Consulta inválida.');
      const success = data.executed === true && qualifies(phaseId, queryText);
      await ensureProgress(user.id, phaseId);
      await sql()(
        `INSERT INTO student_queries (user_id, phase_id, query_text, success)
         VALUES ($1,$2,$3,$4)`,
        [user.id, phaseId, queryText, success]
      );
      await sql()(
        `UPDATE progress
         SET queries_count=queries_count+1,
             attempts=attempts+CASE WHEN $1::boolean=FALSE THEN 1 ELSE 0 END
         WHERE user_id=$2 AND phase_id=$3`,
        [success, user.id, phaseId]
      );
      return res.status(200).json({ ok: true, qualifies: success });
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
        const rows = await sql()(
          `SELECT 1 FROM student_queries
           WHERE user_id=$1 AND phase_id=$2 AND success=TRUE LIMIT 1`,
          [user.id, phaseId]
        );
        if (!rows[0]) return fail(res, 422, 'Execute uma consulta que cumpra o objetivo antes de concluir.');
      }

      await ensureProgress(user.id, phaseId);
      await sql()(
        `UPDATE progress SET status='completed', completed_at=COALESCE(completed_at,NOW())
         WHERE user_id=$1 AND phase_id=$2`,
        [user.id, phaseId]
      );
      return res.status(200).json({ ok: true, reward: phase.reward });
    }

    return fail(res, 400, 'Ação inválida.');
  } catch (error) {
    console.error(error);
    return fail(res, 500, process.env.NODE_ENV === 'development' ? error.message : 'Erro interno do servidor.');
  }
}

async function availablePhase(phaseId) {
  if (!Number.isInteger(phaseId) || phaseId < 1 || phaseId > 8) return null;
  const rows = await sql()('SELECT * FROM phases WHERE id=$1 AND developed=TRUE AND released=TRUE', [phaseId]);
  return rows[0] || null;
}

function qualifies(phaseId, query) {
  const cleaned = query.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  if (!/^(SELECT|WITH|PRAGMA\s+table_info)/i.test(cleaned)) return false;
  if (/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|ATTACH|DETACH|VACUUM)\b/i.test(cleaned)) return false;
  if (phaseId === 1) return true;
  if (phaseId === 2) return /\bWHERE\b/i.test(cleaned) && /\b(AND|OR|LIKE|IN|BETWEEN|ORDER\s+BY)\b/i.test(cleaned);
  if (phaseId === 3) return /\bJOIN\b/i.test(cleaned) && /\bON\b/i.test(cleaned);
  return false;
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}
