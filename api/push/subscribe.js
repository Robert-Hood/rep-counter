import { sql, readBody, SLOTS, FREQS, cleanCounter } from '../_lib/push.js';

// POST { subscription, settings: { freq, slot, counter } } upserts by endpoint.
// counter is { id, name } or null for "anything".
// DELETE { endpoint } removes it. No auth, same as the counters API.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!sql) return res.status(500).json({ error: 'DATABASE_URL is not set' });

  try {
    if (req.method === 'POST') {
      const body = await readBody(req);
      const sub = body?.subscription;
      const freq = body?.settings?.freq;
      const slot = body?.settings?.slot;
      const counter = cleanCounter(body?.settings?.counter);

      if (!sub || typeof sub.endpoint !== 'string' || !sub.keys) {
        return res.status(400).json({ error: 'expected { subscription, settings }' });
      }
      if (!(freq in FREQS) || !SLOTS.includes(slot) || counter === undefined) {
        return res.status(400).json({ error: 'bad settings' });
      }

      await sql`
        insert into push_subscriptions (endpoint, subscription, settings, updated_at)
        values (${sub.endpoint}, ${JSON.stringify(sub)}::jsonb,
                ${JSON.stringify({ freq, slot, counter })}::jsonb, now())
        on conflict (endpoint) do update
          set subscription = excluded.subscription,
              settings     = excluded.settings,
              updated_at   = now()
      `;
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const body = await readBody(req);
      if (!body || typeof body.endpoint !== 'string') {
        return res.status(400).json({ error: 'expected { endpoint }' });
      }
      await sql`delete from push_subscriptions where endpoint = ${body.endpoint}`;
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'POST, DELETE');
    return res.status(405).end();
  } catch (err) {
    console.error('subscribe error', err);
    return res.status(500).json({ error: 'subscribe failed' });
  }
}
