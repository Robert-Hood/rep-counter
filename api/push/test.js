import { sql, vapidReady, readBody, send } from '../_lib/push.js';

// POST { endpoint } sends one random message to that subscription right away.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }
  if (!sql) return res.status(500).json({ error: 'DATABASE_URL is not set' });
  if (!vapidReady) return res.status(500).json({ error: 'VAPID env vars are not set' });

  try {
    const body = await readBody(req);
    if (!body || typeof body.endpoint !== 'string') {
      return res.status(400).json({ error: 'expected { endpoint }' });
    }
    const rows = await sql`
      select endpoint, subscription, settings from push_subscriptions where endpoint = ${body.endpoint}
    `;
    if (!rows.length) return res.status(404).json({ error: 'not subscribed' });

    const result = await send(rows[0]);
    return res.status(result === 'sent' ? 200 : 502).json({ result });
  } catch (err) {
    console.error('test push error', err);
    return res.status(500).json({ error: 'test failed' });
  }
}
