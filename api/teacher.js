import bcrypt from 'bcryptjs';
import { ensureSchema, sql } from '../server/db.js';
import { requireUser } from '../server/auth.js';
import { action, body, fail, method } from '../server/http.js';

export default async function handler(req, res) {
  try {
    await ensureSchema();
    const user = await requireUser(req, res, 'teacher');
    if (!user) return;
    const op = action(req);

    if (op === 'overview' && req.method === 'GET') {
      const phases = await sql()(`
        SELECT p.*,
          COUNT(pr.id) FILTER (WHERE pr.status IN ('in_progress','completed'))::int AS started,
          COUNT(pr.id) FILTER (WHERE pr.status='completed')::int AS completed
        FROM phases p
        LEFT JOIN progress pr ON pr.phase_id=p.id
        GROUP BY p.id
        ORDER BY p.id
      `);
      const students = await sql()(`
        SELECT u.id,u.username,u.created_at,u.last_login_at,
          COUNT(pr.id) FILTER (WHERE pr.status='completed')::int AS completed,
          COALESCE(SUM(pr.queries_count),0)::int AS queries,
          COALESCE(SUM(pr.attempts),0)::int AS attempts
        FROM users u
        LEFT JOIN progress pr ON pr.user_id=u.id
        WHERE u.role='student'
        GROUP BY u.id
        ORDER BY u.username
      `);
      const resets = await sql()(`
        SELECT r.id,r.user_id,r.requested_at,u.username
        FROM password_reset_requests r
        JOIN users u ON u.id=r.user_id
        WHERE r.status='pending'
        ORDER BY r.requested_at
      `);
      return res.status(200).json({ phases, students, resets });
    }

    if (!method(req, res, ['POST'])) return;
    const data = body(req);

    if (op === 'release') {
      const phaseId = Number(data.phase_id);
      const released = Boolean(data.released);
      await sql()('UPDATE phases SET released=$1 WHERE id=$2 AND developed=TRUE', [released, phaseId]);
      return res.status(200).json({ ok: true });
    }

    if (op === 'reset-password') {
      const userId = Number(data.user_id);
      const password = String(data.password || '');
      if (password.length < 6) return fail(res, 422, 'A senha temporária precisa ter pelo menos 6 caracteres.');
      const hash = await bcrypt.hash(password, 12);
      const rows = await sql()(
        `UPDATE users SET password_hash=$1, must_change_password=TRUE
         WHERE id=$2 AND role='student' RETURNING id`,
        [hash, userId]
      );
      if (!rows[0]) return fail(res, 404, 'Aluno não encontrado.');
      await sql()(
        `UPDATE password_reset_requests SET status='resolved', resolved_at=NOW()
         WHERE user_id=$1 AND status='pending'`,
        [userId]
      );
      return res.status(200).json({ ok: true });
    }

    return fail(res, 400, 'Ação inválida.');
  } catch (error) {
    console.error(error);
    return fail(res, 500, process.env.NODE_ENV === 'development' ? error.message : 'Erro interno do servidor.');
  }
}
