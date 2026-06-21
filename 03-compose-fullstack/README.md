# 03 · Full-stack Notes App — Docker Compose practice

## What this project is

A complete web app split into four pieces that you'll wire together with
**Docker Compose**: a React frontend, an Express API, a Postgres database, and
a Redis cache.

```
         host:8080
            │
        ┌───▼────┐      ┌──────────┐      ┌──────────────┐
        │frontend│─/api─▶│   api    │─────▶│ db (Postgres)│
        │ nginx  │      │ Express  │──┐   └──────────────┘
        └────────┘      └──────────┘  │   ┌──────────────┐
                                      └──▶│ cache (Redis)│
                                          └──────────────┘
```

The app code is done (including an `nginx.conf` for the frontend that proxies
`/api` to the backend). **Your job: write a `Dockerfile` for the frontend and
backend, and a `docker-compose.yml` that runs all four services together.**

## The four services

| Service    | Build / image       | Port (internal) | Depends on        | Notes |
|------------|---------------------|-----------------|-------------------|-------|
| `frontend` | build `./frontend`  | `80`            | `api`             | React built by Vite, served by **nginx**; `nginx.conf` proxies `/api` → `api:4000`. Multi-stage: Node build → nginx serve. Publish this one to the host (`8080:80`). |
| `api`      | build `./backend`   | `4000`          | `db`, `cache`     | Express. Do **not** publish to host — only nginx talks to it. |
| `db`       | `postgres:16-alpine`| `5432`          | —                 | Needs a **named volume** for `/var/lib/postgresql/data`. |
| `cache`    | `redis:7-alpine`    | `6379`          | —                 | Stateless cache. |

## Environment variables the `api` needs

| Var                 | Example / default   | Purpose                    |
|---------------------|---------------------|----------------------------|
| `PORT`              | `4000`              | API listen port            |
| `POSTGRES_HOST`     | `db`                | **Compose service name** of Postgres |
| `POSTGRES_PORT`     | `5432`              |                            |
| `POSTGRES_USER`     | `notes`             | Must match the `db` service |
| `POSTGRES_PASSWORD` | (from `.env`)       | Must match the `db` service |
| `POSTGRES_DB`       | `notes`             | Must match the `db` service |
| `REDIS_URL`         | `redis://cache:6379`| Points at the `cache` service |

Postgres reads `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` too.
There's a `.env.example` — copy it to `.env`.

> The backend's `src/healthcheck.js` is a ready-made probe for a `HEALTHCHECK`.
> The backend already creates its table on startup, so no init SQL is needed.

## 🎯 Your Docker task

1. **`backend/Dockerfile`** — multi-stage Node image, non-root, prod deps only, `HEALTHCHECK` via `src/healthcheck.js`, `EXPOSE 4000`.
2. **`frontend/Dockerfile`** — multi-stage: stage 1 runs `npm ci && npm run build` (output in `/app/dist`); stage 2 is `nginx:alpine` that copies `nginx.conf` to `/etc/nginx/conf.d/default.conf` and the built files to `/usr/share/nginx/html`.
3. **`.dockerignore`** in each (exclude `node_modules`, `dist`, `.git`, …).
4. **`docker-compose.yml`** at the project root wiring all four services. Make sure to:
   - [ ] only publish the **frontend** port to the host (`8080:80`)
   - [ ] give the API its env vars (point it at `db` and `cache` by **service name**)
   - [ ] add a **named volume** so Postgres data survives `compose down`
   - [ ] add **healthchecks** to `db` (`pg_isready`) and `cache` (`redis-cli ping`)
   - [ ] use `depends_on:` with `condition: service_healthy` so the API waits until the DB/cache are *actually ready* (not just started)

### Check yourself

```bash
cp .env.example .env
docker compose up --build      # then open http://localhost:8080

docker compose ps              # every service should be "healthy"
# Add notes in the UI, then prove the volume persists data:
docker compose down            # keeps the volume
docker compose up              # notes are still there
docker compose down -v         # full reset (wipes the volume)
```

## API reference (served behind nginx at `/api`)

| Method | Path              | Description                         |
|--------|-------------------|-------------------------------------|
| GET    | `/health`         | Reports status of API + db + cache  |
| GET    | `/api/notes`      | List notes (+ a Redis view counter) |
| POST   | `/api/notes`      | Create a note                       |
| DELETE | `/api/notes/:id`  | Delete a note                       |
