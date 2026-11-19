import webpush from 'web-push';
import { neon } from '@neondatabase/serverless';

// Shared by the push routes. Files under api/_lib are not routed by Vercel.
//
// Hard rule: nothing in here reads rep data. Whether and what a
// notification sends never depends on counter data.

export const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

const { VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
export const vapidReady = Boolean(VAPID_SUBJECT && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
if (vapidReady) webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export const SLOTS = ['morning', 'afternoon', 'evening'];
export const FREQS = { 'now and then': 0.3, 'most days': 0.8, 'every day': 1 };

const TITLE = 'Reps'; // matches the home screen icon name, which iOS shows as "from Reps"
const MESSAGES = [
  "if you feel like a rep, cool. if not, also cool.",
  "no pressure. just here if you want it.",
  "showing up counts. not showing up is fine too.",
  "one rep would be nice. zero is also allowed.",
  "no rush. this'll be here.",
  "a small one, if you're up for it. or not.",
  "doesn't have to be good. doesn't have to be now.",
  "just a wave. carry on.",
  "if a rep fits in, great. if it doesn't, that's okay.",
  "nothing's due. this is just a door left open."
];

// The title is the chosen activity's name (e.g. "meditation") when there is one.
// Only the name is used: never a count, a date or anything about past reps.
export function randomMessage(settings) {
  const counter = settings?.counter;
  return {
    title: counter?.name || TITLE,
    body: MESSAGES[Math.floor(Math.random() * MESSAGES.length)],
    counterId: counter?.id || null // lets a tap open that activity's card
  };
}

// Validates the optional { id, name } activity a subscription is for.
// Returns null for "anything", undefined if it's malformed.
export function cleanCounter(c) {
  if (c === null || c === undefined) return null;
  if (typeof c !== 'object' || typeof c.id !== 'string' || typeof c.name !== 'string') return undefined;
  const id = c.id.slice(0, 64);
  const name = c.name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 60);
  return id && name ? { id, name } : undefined;
}

// Vercel usually parses JSON bodies for us, but not in every runtime config.
// Same fallback as api/counters.js.
export async function readBody(req) {
  if (req.body !== undefined && req.body !== null && req.body !== '') {
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : null;
}

// Sends one random message to a push_subscriptions row. A 404/410 means the
// browser dropped the subscription, so the row is removed.
// Returns 'sent' | 'gone' | 'failed'.
export async function send(row) {
  try {
    await webpush.sendNotification(row.subscription, JSON.stringify(randomMessage(row.settings)), {
      TTL: 3 * 60 * 60 // a push delayed while the phone is off shouldn't land at an odd hour
    });
    return 'sent';
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      await sql`delete from push_subscriptions where endpoint = ${row.endpoint}`;
      return 'gone';
    }
    console.error('push failed', err.statusCode, err.body || err.message);
    return 'failed';
  }
}
