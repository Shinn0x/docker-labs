# 01 · Task Manager API — Dockerfile practice (Node.js monolith)

## 📖 What this project is about

A small Express REST API for managing tasks. It's a self-contained "monolith":
the HTTP layer, an in-memory data store, and the business logic all live in one
Node process — exactly the kind of app a single **Dockerfile** is meant to
package.

The application code is finished and working. **Your job is to write the
`Dockerfile` (and a `.dockerignore`)** that containerizes it the way you'd ship
it to production.

- **Stack:** Node.js 20 + Express
- **Data:** none — tasks live in memory and reset on restart
- **Listens on:** `PORT` (default `3000`)

## ▶️ How it runs (without Docker)

```bash
npm install
npm start          # listens on PORT (default 3000)

curl localhost:3000/health
curl localhost:3000/api/tasks
```

## 🛠️ Try it yourself

**First, review the code** so you know exactly what you're packaging:

| Read this file | What it tells you for the Dockerfile |
|----------------|--------------------------------------|
| `package.json` | start command (`npm start` → `node src/server.js`), Node engine (`>=20`), the single prod dependency (`express`) |
| `src/server.js` | reads `PORT` (default `3000`), handles `SIGTERM` for clean `docker stop` |
| `src/app.js` | the routes — confirms `GET /health` returns `200` |
| `src/healthcheck.js` | a zero-dependency probe you can call from `HEALTHCHECK` (`node src/healthcheck.js` exits `0` when healthy — no curl/wget needed) |

**Then write a `Dockerfile` + `.dockerignore`** aiming for a production-quality
image:

- [ ] **Multi-stage build** — install dependencies in one stage, copy into a clean runtime stage
- [ ] Use a **slim base image** (e.g. `node:20-alpine`) instead of the full image
- [ ] **Order layers for caching** — copy `package*.json` and install deps *before* copying source, so code changes don't reinstall everything
- [ ] Install **production deps only** (`npm ci --omit=dev`)
- [ ] **Run as a non-root user** (the `node` user already exists in the official image)
- [ ] Add a **`HEALTHCHECK`** (use `src/healthcheck.js`)
- [ ] `EXPOSE` the port and set the start `CMD`
- [ ] Write a **`.dockerignore`** (exclude `node_modules`, `.git`, `*.md`, etc.)

**Check yourself:**

```bash
docker build -t task-manager-api .
docker run --rm -p 3000:3000 task-manager-api
docker run --rm task-manager-api whoami    # should print "node", not "root"
docker images task-manager-api             # how small did you get it?
docker ps                                  # HEALTHCHECK should flip to "healthy"
```

## 📚 Stuck? Read the docs

- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [Build cache & layer ordering](https://docs.docker.com/build/cache/)
- [`HEALTHCHECK` instruction](https://docs.docker.com/reference/dockerfile/#healthcheck)
- [`.dockerignore` files](https://docs.docker.com/build/concepts/context/#dockerignore-files)
- [Node.js official image — best practices](https://github.com/nodejs/docker-node/blob/main/README.md#best-practices)

## 🎁 What you'll get from this project

- Confidence writing a **multi-stage Dockerfile** from scratch.
- An intuition for **layer caching** — why dependency manifests get copied before source.
- Habits that make images **small and secure**: alpine base, prod-only deps, non-root user.
- A reusable **`HEALTHCHECK`** pattern that needs no extra packages in the runtime image.
- The headline talking point: *"I shipped a slim, non-root, health-checked Node image."*

## API reference

| Method | Path             | Description      |
|--------|------------------|------------------|
| GET    | `/health`        | Liveness probe   |
| GET    | `/`              | Service metadata |
| GET    | `/api/tasks`     | List tasks       |
| POST   | `/api/tasks`     | Create a task    |
| PATCH  | `/api/tasks/:id` | Update a task    |
| DELETE | `/api/tasks/:id` | Delete a task    |
