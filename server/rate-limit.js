import { sql } from './db.js';

let initialized;

export async function consumeRateLimit(userId, action, limit) {
  initialized ||= sql().query(`CREATE TABLE IF NOT EXISTS request_limits (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    bucket BIGINT NOT NULL,
    hits INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, action, bucket)
  )`);
  await initialized;
  const bucket = Math.floor(Date.now() / 60000);
  const rows = await sql().query(`INSERT INTO request_limits (user_id,action,bucket,hits)
    VALUES ($1,$2,$3,1)
    ON CONFLICT (user_id,action,bucket) DO UPDATE SET hits=request_limits.hits+1
    RETURNING hits`, [userId, action, bucket]);
  return Number(rows[0].hits) <= limit;
}
