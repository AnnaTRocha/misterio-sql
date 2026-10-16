import { ensureSchema } from '../server/db.js';
import { getActivityPlanVisibility } from '../server/activity-plan.js';
import { ACTIVITY_PLAN_CONTENT } from '../server/activity-plan-content.js';
import { method } from '../server/http.js';

export default async function handler(req, res) {
  try {
    if (!method(req, res, ['GET'])) return;
    await ensureSchema();
    res.setHeader('Cache-Control', 'no-store, max-age=0');

    if (!(await getActivityPlanVisibility())) {
      return res.status(404).json({ error: 'Plano de atividades indisponível.' });
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(ACTIVITY_PLAN_CONTENT);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Não foi possível carregar o plano de atividades.' });
  }
}
