# do 100 things

Counter, not a habit tracker. localStorage is the live copy, Neon is the durable one.

## Deploy

1. **Neon** — create a project, open the SQL editor, paste `schema.sql`, run it. Copy the pooled connection string.
2. **Repo** — push this folder to GitHub.
3. **Vercel** — New Project, import the repo, framework preset: Other. Before deploying, add an env var:
   - `DATABASE_URL` = the Neon connection string
4. Deploy.
5. **iPhone** — open the Vercel URL in Safari, Share → Add to Home Screen.

### Notifications (optional)

1. Keys are already generated and the public one is in `index.html`. To rotate them, run `npx web-push generate-vapid-keys` on your computer, update both Vercel vars and the constant in `index.html`, then turn notifications off and on again on the phone.
2. In Vercel → Project → Settings → Environment Variables, add:
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT` = `mailto:you@example.com` (must be `mailto:` or `https:`)
   - `CRON_SECRET` = any long random string
3. The `VAPID_PUBLIC_KEY` in Vercel must match the constant near the bottom of `index.html`. It's public, safe to commit. The private key lives only in Vercel.
4. Run the `push_subscriptions` block from `schema.sql` in the Neon SQL editor (it's safe to re-run the whole file).
5. Deploy. Vercel → Project → Settings → Cron Jobs should list three jobs.
6. On iPhone, **open the app from the home screen icon** (not a Safari tab) → settings → notifications → on → Allow.
7. Tap "send a test". It should arrive within seconds. If not: check iPhone Settings → Notifications → 100 things, and the Vercel logs for `/api/push/test`.

## Files

- `index.html` — the whole app
- `api/counters.js` — GET returns the stored state, POST upserts it
- `schema.sql` — one table, one jsonb column, one row
- `manifest.json`, `icon.png` — home screen install
- `sw.js` — service worker, push only (no fetch handler, no caching)
- `api/push/subscribe.js` — POST upserts a push subscription + settings, DELETE removes it
- `api/push/test.js` — sends one message to a subscription right away
- `api/push/send-{morning,afternoon,evening}.js` — cron targets, share `api/push/_send.js`
- `api/_lib/push.js` — web-push setup, message bank, send helper
- `vercel.json` — three daily crons

## Notes

- The tap never waits on the network. Writes go to localStorage first and push to Neon ~800ms later. Failures are silent by design.
- No auth: anyone with the URL can read/write the row. Deliberate — it's a counter, and auth was scoped out.
- Export button in settings downloads everything as JSON. Insurance, not a feature.
- Notifications are opt-in and deliberately random: each cron rolls against the chosen frequency (now and then ≈ 30%, most days ≈ 80%) and picks from a fixed message bank. The send path never reads the `counters` table, so a notification never means "you didn't do it."
- Cron times are UTC, set for IST: morning 9:30-10:30am, afternoon 2:30-3:30pm, evening 7:30-8:30pm. On the Hobby plan each fires at a random minute within its hour.
