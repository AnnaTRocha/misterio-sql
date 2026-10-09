import crypto from 'node:crypto';
import { ensureProgress, ensureSchema, sql } from '../server/db.js';
import { requireUser } from '../server/auth.js';
import { action, body, fail, method } from '../server/http.js';
import { argIdentityForUser, assessmentSummary, ensureArgFoundation, unlockFinalProtocol } from '../server/arg.js';
import { allowedStatement, evaluateChallenge, executeArchiveQuery, LESSONS } from '../server/challenges.js';
import { consumeRateLimit } from '../server/rate-limit.js';
import { CONCEPTS, publicConcept } from '../server/concepts.js';
import { expectedSqlForPhase, resetTestActivity } from '../server/test-tools.js';

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
    await ensureArgFoundation();
    const user = await requireUser(req, res, 'student');
    if (!user) return;

    const op = action(req);

    if (op === 'dashboard' && req.method === 'GET') {
      const phases = await sql().query(
        'SELECT id, title, description, developed, released FROM phases ORDER BY id'
      );
      const progress = await sql().query(
        'SELECT * FROM progress WHERE user_id=$1 ORDER BY phase_id',
        [user.id]
      );
      const [identity, assessment] = await Promise.all([
        argIdentityForUser(user.id),
        assessmentSummary(user.id)
      ]);
      return res.status(200).json({ phases, progress, identity, assessment });
    }

    if (op === 'test-tools' && req.method === 'GET') {
      if (!user.is_test) return fail(res, 403, 'Ferramentas disponíveis apenas para usuário teste.');
      const phaseId = Number(req.query?.phase_id);
      if (!Number.isInteger(phaseId) || phaseId < 1 || phaseId > 9) {
        return fail(res, 422, 'Fase inválida.');
      }
      return res.status(200).json({
        phase_id: phaseId,
        expected_sql: expectedSqlForPhase(phaseId)
      });
    }

    if (!method(req, res, ['POST'])) return;
    const data = body(req);

    const limits = { query: 12, complete: 8, 'concept-answer': 8, 'nosql-answer': 8, 'unlock-final': 5 };
    if (limits[op] && !(await consumeRateLimit(user.id, op, limits[op]))) {
      res.setHeader('Retry-After', '60');
      return fail(res, 429, 'Muitas tentativas em pouco tempo. Aguarde um minuto.');
    }

    if (op === 'unlock-final') {
      const unlocked = await unlockFinalProtocol(user.id, data.protocol);
      if (!unlocked) return fail(res, 422, 'Protocolo inválido ou pontuação insuficiente.');
      return res.status(200).json({ ok: true });
    }

    if (op === 'nosql-answer') {
      if (!(await availablePhase(9, user.id))) return fail(res, 403, 'Fase indisponível.');
      const answer = normalizeAccessCode(data.answer);
      const correct = answer === 'find';
      await sql().query(`INSERT INTO arg_submissions(user_id,assessment_id,answer,correct) VALUES($1,9,$2,$3)`, [user.id, answer, correct]);
      if (!correct) {
        await ensureProgress(user.id, 9);
        await sql().query(`UPDATE progress SET attempts=attempts+1 WHERE user_id=$1 AND phase_id=9`, [user.id]);
        return fail(res, 422, CONCEPTS[9].feedback);
      }
      return res.status(200).json({ ok: true, ...(await challengeState(user.id, 9)) });
    }

    if (op === 'concept-answer') {
      const phaseId = Number(data.phase_id);
      if (!CONCEPTS[phaseId] || !(await availablePhase(phaseId, user.id))) return fail(res, 403, 'Fase indisponível.');
      const answer = String(data.answer || '');
      const correct = answer === CONCEPTS[phaseId].answer;
      await sql().query(`INSERT INTO arg_submissions(user_id,assessment_id,answer,correct) VALUES($1,$2,$3,$4)`,
        [user.id, phaseId, answer, correct]);
      if (!correct) {
        await ensureProgress(user.id, phaseId);
        await sql().query(`UPDATE progress SET attempts=attempts+1 WHERE user_id=$1 AND phase_id=$2`, [user.id, phaseId]);
        return fail(res, 422, CONCEPTS[phaseId].feedback);
      }
      return res.status(200).json({ ok: true, ...(phaseId === 9 ? await challengeState(user.id, phaseId) : {}) });
    }

    if (op === 'reset-test-activity') {
      if (!user.is_test) return fail(res, 403, 'Ação disponível apenas para usuário teste.');
      const phaseId = Number(data.phase_id);
      const reset = await resetTestActivity(user.id, phaseId);
      if (!reset) return fail(res, 422, 'Fase inválida.');
      return res.status(200).json({ ok: true });
    }

    if (op === 'start') {
      const phaseId = Number(data.phase_id);
      const phase = await availablePhase(phaseId, user.id);
      if (!phase) return fail(res, 403, 'Fase indisponível.');

      if (phaseId >= 3) {
        await ensureProgress(user.id, phaseId);
        await sql().query(`UPDATE progress SET status=CASE WHEN status='not_started' THEN 'in_progress' ELSE status END,
          started_at=COALESCE(started_at,NOW()) WHERE user_id=$1 AND phase_id=$2`, [user.id, phaseId]);
        const state = await challengeState(user.id, phaseId);
        const progress = await sql().query(`SELECT status FROM progress WHERE user_id=$1 AND phase_id=$2`, [user.id, phaseId]);
        const { answer, ...publicLesson } = LESSONS[phaseId];
        return res.status(200).json({ phase_id: phaseId, lesson: publicLesson,
          concept: phaseId === 3 ? null : publicConcept(phaseId),
          already_completed: progress[0]?.status === 'completed', ...state });
      } else {
        await ensureProgress(user.id, phaseId);
        await sql().query(
          `UPDATE progress SET
             status = CASE WHEN status='not_started' THEN 'in_progress' ELSE status END,
             started_at = COALESCE(started_at, NOW())
           WHERE user_id=$1 AND phase_id=$2`,
          [user.id, phaseId]
        );
      }

      const milestones = await collectedMilestones(user.id, phaseId);
      const quiz = await sql().query(`SELECT 1 FROM arg_submissions WHERE user_id=$1 AND assessment_id=$2 AND correct=TRUE LIMIT 1`, [user.id, phaseId]);
      const progress = await sql().query(`SELECT status FROM progress WHERE user_id=$1 AND phase_id=$2`, [user.id, phaseId]);
      return res.status(200).json({ phase_id: phase.id, milestones, concept: publicConcept(phaseId), concept_done: Boolean(quiz[0]), already_completed: progress[0]?.status === 'completed' });
    }

    if (op === 'query') {
      const phaseId = Number(data.phase_id);
      const queryText = String(data.query || '').trim();

      if (!(await availablePhase(phaseId, user.id))) return fail(res, 403, 'Fase indisponível.');
      if (!queryText || queryText.length > 5000) return fail(res, 422, 'Consulta inválida.');

      if (phaseId >= 3) {
        if (!allowedStatement(phaseId, queryText)) return fail(res, 422, 'Comando fora do escopo desta aula ou mais de uma instrução por execução.');
        const before = await challengeState(user.id, phaseId);
        const identity = await argIdentityForUser(user.id);
        const checked = await evaluateChallenge(phaseId, [...before.history, queryText], Number(identity?.group_id || 0), before.nosql_done);
        const succeeded = checked.lastSucceeded;
        await ensureProgress(user.id, phaseId);
        await sql().query(`INSERT INTO student_queries(user_id,phase_id,query_text,success) VALUES($1,$2,$3,$4)`,
          [user.id, phaseId, queryText, succeeded]);
        await sql().query(`UPDATE progress SET queries_count=queries_count+1,
          attempts=attempts+CASE WHEN $1::boolean THEN 0 ELSE 1 END WHERE user_id=$2 AND phase_id=$3`,
          [succeeded, user.id, phaseId]);
        if (!succeeded) return fail(res, 422, checked.lastError || 'Instrução inválida.');
        return res.status(200).json({ ok: true, result: checked.result, milestones: checked.milestones });
      }

      const safe = isSafeReadQuery(cleanQuery(queryText)) && cleanQuery(queryText).split(';').filter(Boolean).length <= 1;
      let result = [];
      let error = null;
      if (safe) {
        try { result = await executeArchiveQuery(queryText); }
        catch (cause) { error = cause.message; }
      }
      const executed = safe && !error;

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

      if (!executed) return fail(res, 422, error || 'Consulta de leitura inválida.');
      const milestones = await collectedMilestones(user.id, phaseId);
      return res.status(200).json({
        ok: true,
        result,
        query_milestones: queryMilestones(phaseId, queryText, result),
        milestones
      });
    }

    if (op === 'complete') {
      const phaseId = Number(data.phase_id);
      const phase = await availablePhase(phaseId, user.id);
      if (!phase) return fail(res, 403, 'Fase indisponível.');

      if (phaseId >= 3) {
        const state = await challengeState(user.id, phaseId);
        const lesson = LESSONS[phaseId];
        const missing = lesson.objectives.filter(([key]) => !state.milestones.includes(key));
        if (missing.length) return fail(res, 422, `Ainda faltam ${missing.length} requisito(s).`);
        const previousCompletion = await sql().query(`SELECT 1 FROM progress WHERE user_id=$1 AND phase_id=$2 AND status='completed' LIMIT 1`, [user.id, phaseId]);
        if (phaseId !== 3 && !previousCompletion[0] && !state.concept_done) return fail(res, 422, 'Conclua a checagem conceitual desta aula.');
        if (normalizeAccessCode(data.answer) !== normalizeAccessCode(lesson.answer)) {
          await sql().query(`UPDATE progress SET attempts=attempts+1 WHERE user_id=$1 AND phase_id=$2`, [user.id, phaseId]);
          return fail(res, 422, 'Identificação incorreta.');
        }
        await sql().query(`UPDATE progress SET status='completed', completed_at=COALESCE(completed_at,NOW()) WHERE user_id=$1 AND phase_id=$2`, [user.id, phaseId]);
        if (phaseId === 3) {
          await sql().query(`UPDATE phase3_progress SET status='completed', completed_at=COALESCE(completed_at,NOW()) WHERE user_id=$1`, [user.id]);
        }
        return res.status(200).json({ ok: true, reward: lesson.answer });
      }

      const required = PHASE_REQUIREMENTS[phaseId] || [];
      const milestones = await collectedMilestones(user.id, phaseId);
      const missing = required.filter(item => !milestones.includes(item));
      if (missing.length) {
        return fail(res, 422, `Ainda existem ${missing.length} etapa(s) da investigação incompleta(s).`);
      }

      const previousCompletion = await sql().query(`SELECT 1 FROM progress WHERE user_id=$1 AND phase_id=$2 AND status='completed' LIMIT 1`, [user.id, phaseId]);
      if (!previousCompletion[0]) {
        const quiz = await sql().query(`SELECT 1 FROM arg_submissions WHERE user_id=$1 AND assessment_id=$2 AND correct=TRUE LIMIT 1`, [user.id, phaseId]);
        if (!quiz[0]) return fail(res, 422, 'Conclua a pergunta conceitual desta aula.');
      }

      const normalized = normalizeAccessCode(data.answer);
      const digest = crypto.createHash('sha256').update(normalized).digest('hex');
      if (digest !== ACCESS_DIGESTS[phaseId]) {
        await sql().query(`UPDATE progress SET attempts=attempts+1 WHERE user_id=$1 AND phase_id=$2`, [user.id, phaseId]);
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

async function challengeState(userId, phaseId) {
  const records = await sql().query(`SELECT query_text FROM student_queries WHERE user_id=$1 AND phase_id=$2 AND success=TRUE ORDER BY id`, [userId, phaseId]);
  const oldRecords = phaseId === 3
    ? await sql().query(`SELECT query_text FROM phase3_queries WHERE user_id=$1 AND success=TRUE ORDER BY id`, [userId])
    : [];
  const history = [...oldRecords, ...records].map(row => row.query_text);
  const quiz = await sql().query(`SELECT 1 FROM arg_submissions WHERE user_id=$1 AND assessment_id=$2 AND correct=TRUE LIMIT 1`, [userId, phaseId]);
  const identity = await argIdentityForUser(userId);
  const concept_done = phaseId === 3 || Boolean(quiz[0]);
  const nosql_done = phaseId === 9 && concept_done;
  const evaluated = await evaluateChallenge(phaseId, history, Number(identity?.group_id || 0), nosql_done);
  if (phaseId === 3) {
    const completed = await sql().query(`SELECT 1 FROM progress
      WHERE user_id=$1 AND phase_id=3 AND status='completed' LIMIT 1`, [userId]);
    if (completed[0]) {
      return { history, milestones: LESSONS[3].objectives.map(([key]) => key), nosql_done, concept_done };
    }
  }
  return { history, milestones: evaluated.milestones, nosql_done, concept_done };
}

async function availablePhase(phaseId, userId) {
  if (!Number.isInteger(phaseId) || phaseId < 1 || phaseId > 9) return null;
  if (phaseId === 9) {
    const assessment = await assessmentSummary(userId);
    if (!assessment.final_eligible || !assessment.final_protocol_unlocked) return null;
  }
  if (phaseId >= 3) {
    const previous = phaseId === 3
      ? await sql().query(`SELECT 1 FROM progress WHERE user_id=$1 AND phase_id=2 AND status='completed' LIMIT 1`, [userId])
      : await sql().query(`SELECT 1 FROM progress WHERE user_id=$1 AND phase_id=$2 AND status='completed' LIMIT 1`, [userId, phaseId - 1]);
    if (!previous[0]) return null;
  }
  const rows = await sql().query(
    'SELECT * FROM phases WHERE id=$1 AND developed=TRUE AND released=TRUE',
    [phaseId]
  );
  return rows[0] || null;
}

async function collectedMilestones(userId, phaseId) {
  const progress = await sql().query(`SELECT status FROM progress WHERE user_id=$1 AND phase_id=$2`, [userId, phaseId]);
  if (progress[0]?.status === 'completed') return PHASE_REQUIREMENTS[phaseId] || [];
  const rows = await sql().query(
      `SELECT query_text
       FROM student_queries
       WHERE user_id=$1 AND phase_id=$2 AND success=TRUE
       ORDER BY id`,
      [userId, phaseId]
    );

  const collected = new Set();
  for (const row of rows) {
    try {
      const result = await executeArchiveQuery(row.query_text);
      queryMilestones(phaseId, row.query_text, result).forEach(item => collected.add(item));
    } catch {
      // Uma consulta histórica inválida não é evidência para a etapa.
    }
  }

  if (phaseId === 2 && collected.has('window') && collected.has('identify')) {
    collected.add('code');
  }

  return [...collected];
}

export function queryMilestones(phaseId, query, result = []) {
  const cleaned = normalizeMilestoneQuery(cleanQuery(query));
  if (!isSafeReadQuery(cleaned)) return [];
  const cells = result.flatMap(set => set.values.flat()).map(value => String(value ?? '').toUpperCase());
  const has = value => cells.includes(String(value).toUpperCase());
  const nonempty = result.some(set => set.values.length > 0);

  if (phaseId === 1) {
    const found = [];
    if (/\bFROM\s+usuarios\b/i.test(cleaned) && has('desconhecido')) found.push('users');
    if (nonempty && /^SELECT\s+(?!\*)[\s\S]+?\s+FROM\s+(usuarios|mensagens|arquivos|acessos|pessoas)\b/i.test(cleaned)) {
      found.push('projection');
    }
    if (/\bFROM\s+mensagens\b/i.test(cleaned) && /\bWHERE\b/i.test(cleaned) && /\bremetente_id\b/i.test(cleaned) && cells.some(value => value.includes('1987'))) found.push('messages');
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
    ) if (nonempty && (has('Ana Souza') || has('Alice Gomes') || has('André Lopes'))) found.push('witness');

    if (
      /\bFROM\s+acessos\b/i.test(cleaned) &&
      /\bhora_saida\s+IS\s+NULL\b/i.test(cleaned)
    ) if (has(102) || has('1987-09-17 23:41')) found.push('missing');

    if (
      /\bFROM\s+pessoas\b/i.test(cleaned) &&
      /\bSELECT\s+DISTINCT\s*(?:\(\s*)?cidade(?:\s*\))?(?:\s+AS\s+\w+)?\b/i.test(cleaned)
    ) if (['Orleans', 'Tubarão', 'Criciúma', 'Braço do Norte'].every(has)) found.push('cities');

    if (
      /\bFROM\s+acessos\b/i.test(cleaned) &&
      /\bORDER\s+BY\s+(?:\w+\.)?data_hora\s+DESC\b/i.test(cleaned)
    ) if (result[0]?.values[0]?.some(value => String(value) === '193' || String(value) === '1987-09-21 03:31')) found.push('last_access');

    const hasCount = /\bCOUNT\s*\(\s*(?:DISTINCT\s+)?(?:\*|1|(?:\w+\.)?[a-z_][a-z0-9_]*)\s*\)/i.test(cleaned);

    if (
      /\bFROM\s+acessos\b/i.test(cleaned) &&
      hasCount &&
      /\bGROUP\s+BY\s+(?:\w+\.)?(?:pessoa_id|usuario_id)\b/i.test(cleaned)
    ) if (result.some(set => set.values.some(row => row.some(value => String(value) === '37') && row.some(value => String(value) === '18')))) found.push('frequency');

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
      /\bGROUP\s+BY\s+(?:\w+\.)?(?:pessoa_id|usuario_id)\b/i.test(cleaned)
    ) if (result.some(set => set.values.some(row => row.some(value => String(value) === '37') && row.some(value => String(value) === '12')))) found.push('window');

    if (
      /\bFROM\s+usuarios\b/i.test(cleaned) &&
      /\bWHERE\b/i.test(cleaned) &&
      (
        /\b(?:\w+\.)?id\s*=\s*37\b/i.test(cleaned) ||
        /\b37\s*=\s*(?:\w+\.)?id\b/i.test(cleaned)
      )
    ) if (has('ORION')) found.push('identify');

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
