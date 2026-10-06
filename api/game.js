import crypto from 'node:crypto';
import { ensureProgress, ensureSchema, sql } from '../server/db.js';
import { requireUser } from '../server/auth.js';
import { action, body, fail, method } from '../server/http.js';

const ACCESS_DIGESTS = {
  1: '744b93f9950fc38dad705556931ea48193b99dcb191cc9bd77097f65fbe2f0b8',
  2: 'a925617886e8799cc5be05aee17f9b70fa3e91370a471e06c21277c10804d0dc'
};

const PHASE_REQUIREMENTS = {
  1: ['users', 'projection', 'messages'],
  2: ['witness', 'missing', 'cities', 'last_access', 'frequency', 'code']
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

      const executed = data.executed === true && isSafeReadQuery(cleanQuery(queryText));

      await ensureProgress(user.id, phaseId);
      await sql().query(
        `INSERT INTO student_queries (user_id, phase_id, query_text, success)
         VALUES ($1,$2,$3,$4)`,
        [user.id, phaseId, queryText, executed]
      );
      await sql().query(
        `UPDATE progress
         SET queries_count=queries_count+1,
             attempts=attempts+CASE WHEN $1::boolean=FALSE THEN 1 ELSE 0 END
         WHERE user_id=$2 AND phase_id=$3`,
        [executed, user.id, phaseId]
      );

      const milestones = await collectedMilestones(user.id, phaseId);
      return res.status(200).json({
        ok: true,
        query_milestones: queryMilestones(phaseId, queryText),
        milestones
      });
    }

    if (op === 'complete') {
      const phaseId = Number(data.phase_id);
      const phase = await availablePhase(phaseId);
      if (!phase) return fail(res, 403, 'Fase indisponível.');

      const required = PHASE_REQUIREMENTS[phaseId] || [];
      const milestones = await collectedMilestones(user.id, phaseId);
      const missing = required.filter(item => !milestones.includes(item));
      if (missing.length) {
        return fail(res, 422, `Ainda existem ${missing.length} etapa(s) da investigação incompleta(s).`);
      }

      const normalized = normalizeAccessCode(data.answer);
      const digest = crypto.createHash('sha256').update(normalized).digest('hex');
      if (digest !== ACCESS_DIGESTS[phaseId]) {
        return fail(res, 422, 'Código de acesso incorreto.');
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
  if (!Number.isInteger(phaseId) || phaseId < 1 || phaseId > 2) return null;
  const rows = await sql().query(
    'SELECT * FROM phases WHERE id=$1 AND developed=TRUE AND released=TRUE',
    [phaseId]
  );
  return rows[0] || null;
}

async function collectedMilestones(userId, phaseId) {
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

  if (phaseId === 2 && collected.has('window') && collected.has('identify')) {
    collected.add('code');
  }

  return [...collected];
}

function queryMilestones(phaseId, query) {
  const cleaned = normalizeMilestoneQuery(cleanQuery(query));
  if (!isSafeReadQuery(cleaned)) return [];

  if (phaseId === 1) {
    const found = [];
    if (/\bFROM\s+usuarios\b/i.test(cleaned)) found.push('users');
    if (/^SELECT\s+(?!\*)[\s\S]+?\s+FROM\s+(usuarios|mensagens|arquivos|acessos|pessoas)\b/i.test(cleaned)) {
      found.push('projection');
    }
    if (/\bFROM\s+mensagens\b/i.test(cleaned)) found.push('messages');
    return [...new Set(found)];
  }

  if (phaseId === 2) {
    const found = [];

    const hasAgeRange =
      /\bidade\s+BETWEEN\s+20\s+AND\s+30\b/i.test(cleaned) ||
      (
        /\bidade\s*>=\s*20\b/i.test(cleaned) &&
        /\bidade\s*<=\s*30\b/i.test(cleaned)
      ) ||
      (
        /\b20\s*<=\s*idade\b/i.test(cleaned) &&
        /\b30\s*>=\s*idade\b/i.test(cleaned)
      );

    if (
      /\bFROM\s+pessoas\b/i.test(cleaned) &&
      /\bWHERE\b/i.test(cleaned) &&
      hasAgeRange &&
      /\bnome\s+LIKE\s+['"]A%['"]/i.test(cleaned)
    ) found.push('witness');

    if (
      /\bFROM\s+acessos\b/i.test(cleaned) &&
      /\bhora_saida\s+IS\s+NULL\b/i.test(cleaned)
    ) found.push('missing');

    if (
      /\bFROM\s+pessoas\b/i.test(cleaned) &&
      /\bSELECT\s+DISTINCT\s*(?:\(\s*)?cidade(?:\s*\))?(?:\s+AS\s+\w+)?\b/i.test(cleaned)
    ) found.push('cities');

    if (
      /\bFROM\s+acessos\b/i.test(cleaned) &&
      /\bORDER\s+BY\s+(?:\w+\.)?data_hora\s+DESC\b/i.test(cleaned)
    ) found.push('last_access');

    const hasCount = /\bCOUNT\s*\(\s*(?:\*|1)\s*\)/i.test(cleaned);

    if (
      /\bFROM\s+acessos\b/i.test(cleaned) &&
      hasCount &&
      /\bGROUP\s+BY\s+(?:\w+\.)?pessoa_id\b/i.test(cleaned)
    ) found.push('frequency');

    const hasDateRange =
      /\bdata\s+BETWEEN\s+['"]1987-09-17['"]\s+AND\s+['"]1987-09-21['"]/i.test(cleaned) ||
      (
        /\bdata\s*>=\s*['"]1987-09-17['"]/i.test(cleaned) &&
        /\bdata\s*<=\s*['"]1987-09-21['"]/i.test(cleaned)
      ) ||
      (
        /['"]1987-09-17['"]\s*<=\s*data\b/i.test(cleaned) &&
        /['"]1987-09-21['"]\s*>=\s*data\b/i.test(cleaned)
      );

    if (
      /\bFROM\s+acessos\b/i.test(cleaned) &&
      hasDateRange &&
      hasCount &&
      /\bGROUP\s+BY\s+(?:\w+\.)?usuario_id\b/i.test(cleaned)
    ) found.push('window');

    if (
      /\bFROM\s+usuarios\b/i.test(cleaned) &&
      /\bWHERE\b/i.test(cleaned) &&
      (
        /\b(?:\w+\.)?id\s*=\s*37\b/i.test(cleaned) ||
        /\b37\s*=\s*(?:\w+\.)?id\b/i.test(cleaned)
      )
    ) found.push('identify');

    return [...new Set(found)];
  }

  return [];
}

function normalizeMilestoneQuery(query) {
  return String(query || '')
    .replace(/["`\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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

function normalizeAccessCode(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}
