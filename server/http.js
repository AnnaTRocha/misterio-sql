export function method(req, res, allowed) {
  if (!allowed.includes(req.method)) {
    res.setHeader('Allow', allowed.join(', '));
    res.status(405).json({ error: 'Método não permitido.' });
    return false;
  }
  return true;
}

export function action(req) {
  return String(req.query?.action || req.body?.action || '');
}

export function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.trim()) {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

export function fail(res, status, message) {
  return res.status(status).json({ error: message });
}
