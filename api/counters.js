import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const ROW_ID = 1;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (req.method === 'GET') {
      const rows = await sql`select data from counters where id = ${ROW_ID}`;
      return res.status(200).json(rows[0]?.data ?? null);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      if (!body || !Array.isArray(body.counters)) {
        return res.status(400).json({ error: 'expected { counters: [...] }' });
      }

      await sql`
        insert into counters (id, data, updated_at)
        values (${ROW_ID}, ${JSON.stringify(body)}::jsonb, now())
        on conflict (id) do update
          set data = excluded.data, updated_at = now()
      `;

      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end();
  } catch (err) {
    console.error('sync error', err);
    return res.status(500).json({ error: 'sync failed' });
  }
}
