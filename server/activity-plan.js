import { sql } from './db.js';

const VISIBILITY_KEY = 'activity_plan_public';

export async function getActivityPlanVisibility() {
  const rows = await sql().query('SELECT value FROM app_meta WHERE key=$1 LIMIT 1', [VISIBILITY_KEY]);
  if (!rows[0]) return true;
  return rows[0].value === 'true';
}

export async function setActivityPlanVisibility(isPublic) {
  await sql().query(
    `INSERT INTO app_meta (key,value) VALUES ($1,$2)
     ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`,
    [VISIBILITY_KEY, String(isPublic)]
  );
}
