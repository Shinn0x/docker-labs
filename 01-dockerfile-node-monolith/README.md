# 01 · Task Manager API — Dockerfile practice (Node.js monolith)

## What this project is

A small Express REST API for managing tasks. It's a self-contained "monolith":
the HTTP layer, an in-memory data store, and the logic all live in one Node
process — exactly the kind of app a single **Dockerfile** is meant to package.

The app code is done. **Your job is to write the `Dockerfile` (and a
`.dockerignore`)** that containerizes it well.

## Stack

- Node.js 20 + Express
- No database — tasks live in memory (reset on restart)

## How it runs (without Docker)

```bash
npm install
npm start          # listens on PORT (default 3000)

curl localhost:3000/health
curl localhost:3000/api/tasks
```

## What the container needs to know

| Concern        | Detail                                                       |
|----------------|--------------------------------------------------------------|
| Start command  | `node src/server.js` (or `npm start`)                        |
| Port           | `3000` (overridable via `PORT` env var)                      |
| Dependencies   | Installed from `package.json` / `package-lock.json` via npm  |
| Health endpoint| `GET /health` returns `200`                                  |
| Health helper  | `src/healthcheck.js` — a zero-dependency probe you can call from a `HEALTHCHECK` (`node src/healthcheck.js` exits 0 when healthy) |

## 🎯 Your Docker task

Write a `Dockerfile` + `.dockerignore`. Aim for a production-quality image:

- [ ] **Multi-stage build** — install dependencies in one stage, copy into a clean runtime stage
- [ ] Use a **slim base image** (e.g. `node:20-alpine`) instead of the full image
- [ ] **Order layers for caching** — copy `package*.json` and install deps *before* copying source, so code changes don't reinstall everything
- [ ] Install **production deps only** (`npm ci --omit=dev`)
- [ ] **Run as a non-root user** (the `node` user exists in the official image)
- [ ] Add a **`HEALTHCHECK`** (use `src/healthcheck.js`)
- [ ] `EXPOSE` the port and set the start `CMD`
- [ ] Write a **`.dockerignore`** (exclude `node_modules`, `.git`, `*.md`, etc.)

### Check yourself

```bash
docker build -t task-manager-api .
docker run --rm -p 3000:3000 task-manager-api
docker run --rm task-manager-api whoami    # should print "node", not "root"
docker images task-manager-api             # how small did you get it?
docker ps                                  # HEALTHCHECK should flip to "healthy"
```

## API reference

| Method | Path             | Description      |
|--------|------------------|------------------|
| GET    | `/health`        | Liveness probe   |
| GET    | `/`              | Service metadata |
| GET    | `/api/tasks`     | List tasks       |
| POST   | `/api/tasks`     | Create a task    |
| PATCH  | `/api/tasks/:id` | Update a task    |
| DELETE | `/api/tasks/:id` | Delete a task    |
