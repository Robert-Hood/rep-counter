import { neon } from '@neondatabase/serverless';

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
const ROW_ID = 1;

// Vercel usually parses JSON bodies for us, but not in every runtime config.
// Fall back to reading the raw stream so a POST can't silently fail.
async function readBody(req) {
  if (req.body !== undefined && req.body !== null && req.body !== '') {
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!sql) {
    return res.status(500).json({ error: 'DATABASE_URL is not set' });
  }

  try {
    if (req.method === 'GET') {
      const rows = await sql`select data from counters where id = ${ROW_ID}`;
      return res.status(200).json(rows[0]?.data ?? null);
    }

    if (req.method === 'POST') {
      const body = await readBody(req);

      if (!body || !Array.isArray(body.counters)) {
        return res.status(400).json({ error: 'expected { counters: [...] }' });
      }

      await sql`
        insert into counters (id, data, updated_at)
        values (${ROW_ID}, ${JSON.stringify(body)}::jsonb, now())
        on conflict (id) do update
          set data = excluded.data, updated_at = now()
      `;

      return res.status(200).json({ ok: true, saved: body.counters.length });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end();
  } catch (err) {
    console.error('sync error', err);
    return res.status(500).json({ error: 'sync failed', detail: String(err.message || err) });
  }
}
