# do 100 things

Counter, not a habit tracker. localStorage is the live copy, Neon is the durable one.

## Deploy

1. **Neon** — create a project, open the SQL editor, paste `schema.sql`, run it. Copy the pooled connection string.
2. **Repo** — push this folder to GitHub.
3. **Vercel** — New Project, import the repo, framework preset: Other. Before deploying, add an env var:
   - `DATABASE_URL` = the Neon connection string
4. Deploy.
5. **iPhone** — open the Vercel URL in Safari, Share → Add to Home Screen.

## Files

- `index.html` — the whole app
- `api/counters.js` — GET returns the stored state, POST upserts it
- `schema.sql` — one table, one jsonb column, one row
- `manifest.json`, `icon.png` — home screen install

## Notes

- The tap never waits on the network. Writes go to localStorage first and push to Neon ~800ms later. Failures are silent by design.
- No auth: anyone with the URL can read/write the row. Deliberate — it's a counter, and auth was scoped out.
- Export button in settings downloads everything as JSON. Insurance, not a feature.
