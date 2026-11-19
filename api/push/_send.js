import { sql, vapidReady, send, FREQS } from '../_lib/push.js';

// Shared cron handler. Each slot has its own tiny route file (send-morning.js
// etc.) so the cron paths need no query string.
//
// Hard rule: this must never read rep data. Whether a notification
// goes out is a random roll against the chosen frequency, nothing else.
export function makeSlotHandler(slot) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    if (!sql) return res.status(500).json({ error: 'DATABASE_URL is not set' });
    if (!vapidReady) return res.status(500).json({ error: 'VAPID env vars are not set' });

    try {
      const rows = await sql`
        select endpoint, subscription, settings from push_subscriptions
        where settings->>'slot' = ${slot}
      `;
      const tally = { subscribers: rows.length, skipped: 0, sent: 0, gone: 0, failed: 0 };

      await Promise.all(rows.map(async row => {
        const chance = FREQS[row.settings?.freq] ?? FREQS['now and then'];
        if (Math.random() >= chance) { tally.skipped++; return; }
        tally[await send(row)]++;
      }));

      console.log('push send', slot, tally);
      return res.status(200).json({ slot, ...tally });
    } catch (err) {
      console.error('push send error', slot, err);
      return res.status(500).json({ error: 'send failed' });
    }
  };
}
