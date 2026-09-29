import bcrypt from 'bcryptjs';
import { ensureSchema, sql } from '../server/db.js';
import { action, body, fail, method } from '../server/http.js';
import {
  clearSession,
  currentUser,
  normalizeUsername,
  requireUser,
  setSession,
  validUsername
} from '../server/auth.js';

export default async function handler(req, res) {
  try {
    await ensureSchema();
    const op = action(req);

    if (op === 'me' && req.method === 'GET') {
      const user = await currentUser(req);
      return res.status(200).json({ user });
    }

    if (!method(req, res, ['POST'])) return;
    const data = body(req);

    if (op === 'login') {
      const username = normalizeUsername(data.username);
      const rows = await sql().query('SELECT * FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1', [username]);
      const user = rows[0];
      if (!user || !(await bcrypt.compare(String(data.password || ''), user.password_hash))) {
        return fail(res, 401, 'Login ou senha inválidos.');
      }
      await sql().query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
      setSession(res, user);
      return res.status(200).json({ user: sanitize(user) });
    }

    if (op === 'register') {
      const username = normalizeUsername(data.username);
      const password = String(data.password || '');
      const confirm = String(data.confirm || '');

      if (!validUsername(username)) return fail(res, 422, 'Use um login de 3 a 30 caracteres com letras, números, ponto, hífen ou _.');
      if (username.toLowerCase() === 'professor') return fail(res, 422, 'Este login é reservado.');
      if (password.length < 6) return fail(res, 422, 'A senha deve ter pelo menos 6 caracteres.');
      if (password !== confirm) return fail(res, 422, 'As senhas não conferem.');

      const passwordHash = await bcrypt.hash(password, 12);
      try {
        const rows = await sql().query(
          `INSERT INTO users (username, password_hash, role)
           VALUES ($1,$2,'student') RETURNING id, username, role, must_change_password`,
          [username, passwordHash]
        );
        setSession(res, rows[0]);
        return res.status(201).json({ user: rows[0] });
      } catch (error) {
        if (String(error.message).toLowerCase().includes('unique')) return fail(res, 409, 'Esse login já está em uso.');
        throw error;
      }
    }

    if (op === 'logout') {
      clearSession(res);
      return res.status(200).json({ ok: true });
    }

    if (op === 'request-reset') {
      const username = normalizeUsername(data.username);
      const rows = await sql().query(
        `SELECT id FROM users WHERE LOWER(username)=LOWER($1) AND role='student' LIMIT 1`,
        [username]
      );
      if (rows[0]) {
        await sql().query(
          `UPDATE password_reset_requests SET status='resolved', resolved_at=NOW()
           WHERE user_id=$1 AND status='pending'`,
          [rows[0].id]
        );
        await sql().query(
          `INSERT INTO password_reset_requests (user_id, status) VALUES ($1,'pending')`,
          [rows[0].id]
        );
      }
      return res.status(200).json({ message: 'Se o aluno existir, a solicitação foi enviada ao professor.' });
    }

    if (op === 'change-password') {
      const user = await requireUser(req, res);
      if (!user) return;
      const password = String(data.password || '');
      const confirm = String(data.confirm || '');
      if (password.length < 6) return fail(res, 422, 'A senha deve ter pelo menos 6 caracteres.');
      if (password !== confirm) return fail(res, 422, 'As senhas não conferem.');
      const passwordHash = await bcrypt.hash(password, 12);
      await sql().query('UPDATE users SET password_hash=$1, must_change_password=FALSE WHERE id=$2', [passwordHash, user.id]);
      return res.status(200).json({ ok: true });
    }

    return fail(res, 400, 'Ação inválida.');
  } catch (error) {
    console.error(error);
    return fail(res, 500, process.env.NODE_ENV === 'development' ? error.message : 'Erro interno do servidor.');
  }
}

function sanitize(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    must_change_password: user.must_change_password
  };
}
