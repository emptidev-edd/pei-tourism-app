# Security — Admin API Key & Production Checklist

## The Admin API Key (`ADMIN_API_KEY`)

### What it protects

Every route under `/api/admin/*` requires authentication. That surface includes:

- **Seed routes** — `POST /api/admin/seed/beaches`, `/food-drink`, `/accommodation`, `/family-fun`
- **Event ingest** — `POST /api/admin/ingest/events/all` and the 8 per-source ingest routes
- **Data integration** — `POST /api/admin/ingest/open-data`, `/gtfs`, `/visitor-centres`
- **Place utilities** — `POST /api/admin/places/recompute-scores`, `/:id/feature`, `/:id/image`
- **ArcGIS discovery** — `GET /api/admin/arcgis/*`

Without the key, any of these could be triggered by anyone who can reach the API —
reseeding data, hammering external sites with scrape jobs, or overwriting place images.

### How it works

- Middleware: `src/middleware/requireAdminKey.ts`, mounted in `src/routes/index.ts`:

  ```ts
  router.use('/admin', adminLimiter, requireAdminKey, adminRoutes);
  ```

- Requests must send the key in an `x-admin-key` header. The middleware compares it
  against the `ADMIN_API_KEY` env var using a constant-time comparison (no timing leaks).
- **Fail-closed:** if `ADMIN_API_KEY` is not set, ALL admin routes return 401 in every
  environment. A missing key never means "open access" — it means "admin disabled".
- Failed attempts are logged to `logs/errLog.log` with method, URL, and IP.
- The admin surface is also rate-limited to 30 requests / 15 min per IP
  (`src/middleware/rateLimiters.ts`), which throttles brute-force attempts.

### What is NOT affected

- **The Expo app** — it only calls public routes (`/api/places`, `/api/events`,
  `/api/trip`, transit, visitor centres). No key needed.
- **Cron jobs** — the daily event ingest (2 AM) and weekly GTFS sync (Sunday 3 AM) in
  `src/server.ts` call the ingest functions directly in-process, not over HTTP.
  They run with or without the key.

### Using it

```bash
# Manual admin call (key from .env)
curl -X POST http://localhost:4000/api/admin/ingest/events/all \
  -H "x-admin-key: $ADMIN_API_KEY"
```

Without the header (or with a wrong key) you get:

```json
HTTP 401  { "ok": false, "message": "Unauthorized" }
```

### Generating / rotating the key

```bash
openssl rand -hex 32
```

Put the value in `.env` (gitignored — never commit it):

```
ADMIN_API_KEY=<generated value>
```

Restart the server after changing it (with `npm run dev`, touch a source file or
restart the watcher — `.env` changes alone don't trigger a reload).

Rotate the key any time you suspect it leaked. There are no sessions or tokens to
invalidate — changing the env var and restarting is the whole rotation.

---

## Going to Production Checklist

### 1. Rotate the Postgres password (required)

The original password was committed in `docker-compose.visit.yml` (before commit
`149ff10`) and lives in git history forever. Before the repo goes public or the database is reachable
from anywhere but localhost:

```bash
# 1. Pick a new password, update .env.docker (POSTGRES_PASSWORD) and .env (DATABASE_URL)
# 2. Apply it to the existing database (the volume keeps the old one otherwise):
docker exec -it visit_upei_db psql -U visit_upei -c "ALTER USER visit_upei WITH PASSWORD '<new password>';"
# 3. Restart the API so Prisma picks up the new DATABASE_URL
```

### 2. Set env vars on the production host

All config comes from env vars — see `.env.example` for the full inventory.
Minimum for prod:

| Var | Notes |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | prod Postgres connection string |
| `ADMIN_API_KEY` | fresh key, different from the dev one |
| `TRANSITLAND_API_KEY` | required for GTFS sync |
| `PORT` | defaults to 4000 |

Generate a **separate** `ADMIN_API_KEY` for prod — never reuse the dev key.

### 3. Reverse proxy / HTTPS

- Serve the API behind HTTPS only (reverse proxy: nginx, Caddy, or the platform's
  load balancer). The admin key travels in a header — over plain HTTP it's readable
  by anyone on the path.
- If behind a proxy, enable trust proxy in `src/app.ts` so rate limiting keys on the
  real client IP instead of the proxy's:

  ```ts
  app.set('trust proxy', 1);
  ```

  Without this, every user shares the proxy's IP and one busy user rate-limits everyone.

### 4. Review rate limits

Current limits in `src/middleware/rateLimiters.ts`:

- `/api/*` — 300 requests / 15 min per IP (fine for the app's query patterns)
- `/api/admin/*` — 30 requests / 15 min per IP

These are in-memory, per-process. If you ever run multiple API instances, move to a
shared store (the `rate-limit-redis` package — Redis is already in docker-compose).

### 5. CORS

`src/config/allowedOrigins.ts` currently allows localhost dev origins. The native app
doesn't send an Origin header (CORS doesn't apply to it), so for a mobile-only prod
deploy the allowlist can stay tight. Only add prod origins if a web client ships.

### 6. Don't commit secrets

- `.env`, `.env.local`, `.env.docker` are gitignored — keep it that way.
- `.env.example` holds placeholders only; update it when adding new vars.
- Docker DB credentials come from `.env.docker` via `env_file` — never inline them
  in `docker-compose.visit.yml` again.

### Quick smoke test after deploy

```bash
BASE=https://your-prod-host

curl -s $BASE/api/places/featured | head -c 100          # public route works
curl -si -X POST $BASE/api/admin/ingest/events/all | head -1   # 401 without key
curl -si -X POST $BASE/api/admin/ingest/events/all \
  -H "x-admin-key: $ADMIN_API_KEY" | head -1              # 200 with key
```
