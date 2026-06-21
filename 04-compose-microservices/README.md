# 04 · E-commerce Microservices — Docker Compose practice

## 📖 What this project is about

A small but realistic **microservices** system you'll orchestrate with Docker
Compose: an nginx **API gateway** in front of three independent services (in
two languages), each owning its own data, plus a shared cache. It's the
capstone of the suite — everything from projects 01–03 (multi-stage Node
images, multi-stage Java images, Compose networking, volumes, healthchecks)
comes together here, with service-to-service calls on top.

```
                  host:8080
                     │
               ┌─────▼──────┐
               │  gateway   │  nginx — the only public entrypoint
               └─────┬──────┘
       ┌─────────────┼──────────────┐
  /api/auth/    /api/catalog/   /api/orders/
       │             │              │
 auth-service   catalog-service  order-service
   (Node)        (Java/Spring)     (Node)
       │                          │      │
     Redis      order-service ────┘      └──── Postgres
                calls auth + catalog
                over the internal network
```

The application code + the gateway's `nginx.conf` are finished and working.
**Your job: write a `Dockerfile` for each service and a `docker-compose.yml`
that brings the whole system up with one command.**

### How it works

- **Gateway** (`nginx`) is the only thing published to the host. It routes by
  URL prefix: `/api/auth/` → auth-service, `/api/catalog/` → catalog-service,
  `/api/orders/` → order-service. The services themselves are *not* reachable
  from the host — only through the gateway.
- **auth-service** issues opaque bearer tokens on `/login` and stores them in
  Redis with a TTL; other services call `/verify` to validate a token.
- **catalog-service** is a stateless Java/Spring product list (in-memory).
- **order-service** ties it together: on `POST /orders` it calls auth (verify
  the token), then catalog (look up the product + price), then writes the order
  to its **own** Postgres database (`orders-db`).
- Services find each other by **Compose service name** over the internal
  network — no IPs, no host ports.

## The six services

| Service           | Build / image        | Port  | Depends on                         | Notes |
|-------------------|----------------------|-------|------------------------------------|-------|
| `gateway`         | build `./gateway`    | `80`  | the 3 services                     | nginx reverse proxy; `nginx.conf` routes by path. **Only service published to host** (`8080:80`). |
| `auth-service`    | build `./auth-service`| `5001`| `cache`                            | Node. Issues/verifies tokens in Redis. |
| `catalog-service` | build `./catalog-service` | `8080` | —                              | Java/Spring Boot. In-memory product list. Multi-stage build (see project 02). |
| `order-service`   | build `./order-service`| `5002`| `orders-db`, `auth-service`, `catalog-service` | Node. Calls auth + catalog over the network, writes to Postgres. |
| `orders-db`       | `postgres:16-alpine` | `5432`| —                                  | Needs a **named volume**. |
| `cache`           | `redis:7-alpine`     | `6379`| —                                  | Used by auth-service. |

> The gateway's `nginx.conf` references the upstreams by exact service name:
> `auth-service:5001`, `catalog-service:8080`, `order-service:5002`. **Name
> your Compose services to match**, or update the conf.

## ▶️ How it runs

```bash
cp .env.example .env
docker compose up --build      # then hit http://localhost:8080
```

## 🛠️ Try it yourself

**First, review the code** to see how the pieces find and call each other —
this is what your Compose file and Dockerfiles have to reproduce:

| Read this file | What it tells you for Compose / Dockerfiles |
|----------------|----------------------------------------------|
| `gateway/nginx.conf` | path-based routing + the **exact upstream service names/ports** your Compose services must match (`auth-service:5001`, `catalog-service:8080`, `order-service:5002`) |
| `auth-service/src/server.js` | reads `PORT` + `REDIS_URL`, `/health` only goes green once Redis answers, exposes `/login` and `/verify` |
| `order-service/src/server.js` | reaches peers via `AUTH_URL` / `CATALOG_URL` (service names!), Postgres via `POSTGRES_*`, creates its table on boot (no init SQL) |
| `catalog-service/.../ProductController.java` | the Java routes (`/products`, `/products/{id}`) — no DB, multi-stage build like project 02 |
| `*/src/healthcheck.js` | ready-made probes for the Node services' `HEALTHCHECK`; the Java service uses `/actuator/health` |
| `.env.example` | the Postgres user/password/db the `orders-db` service and `order-service` must share |

### Environment variables

**`auth-service`**

| Var         | Value                 |
|-------------|-----------------------|
| `PORT`      | `5001`                |
| `REDIS_URL` | `redis://cache:6379`  |

**`order-service`**

| Var                 | Value                          | Purpose                          |
|---------------------|--------------------------------|----------------------------------|
| `PORT`              | `5002`                         |                                  |
| `AUTH_URL`          | `http://auth-service:5001`     | Calls auth to verify tokens      |
| `CATALOG_URL`       | `http://catalog-service:8080`  | Calls catalog to look up products|
| `POSTGRES_HOST`     | `orders-db`                    | Service name of its database     |
| `POSTGRES_USER`     | `orders`                       | Match the `orders-db` service    |
| `POSTGRES_PASSWORD` | (from `.env`)                  | Match the `orders-db` service    |
| `POSTGRES_DB`       | `orders`                       | Match the `orders-db` service    |

> `orders-db` reads `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`.
> Copy `.env.example` → `.env`.

**Then build the artifacts:**

1. **A `Dockerfile` per service** (+ `.dockerignore`):
   - `auth-service`, `order-service` → multi-stage Node, non-root, `HEALTHCHECK` via `src/healthcheck.js`.
   - `catalog-service` → multi-stage Maven→JRE Java image (reuse what you learned in project 02).
   - `gateway` → `nginx:alpine` that copies `nginx.conf` to `/etc/nginx/conf.d/default.conf`.
2. **`docker-compose.yml`** wiring all six services. Make sure to:
   - [ ] publish **only** the gateway (`8080:80`)
   - [ ] name services to match the gateway upstreams + the `*_URL` env vars
   - [ ] pass each service its environment variables
   - [ ] add a **named volume** for `orders-db`
   - [ ] add **healthchecks** to `orders-db` (`pg_isready`) and `cache` (`redis-cli ping`)
   - [ ] use `depends_on: condition: service_healthy` so startup is ordered (cache → auth → … → gateway)

**Check yourself — full flow:**

```bash
cp .env.example .env
docker compose up --build
docker compose ps                       # all six healthy

curl localhost:8080/api/catalog/products   # Java service via gateway

# Log in (auth → Redis), grab the token:
TOKEN=$(curl -s -X POST localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"password123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Place an order: order-service validates the token (auth) AND the product (catalog),
# then writes to its own Postgres:
curl -X POST localhost:8080/api/orders/orders \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"productId":2,"quantity":3}'

curl localhost:8080/api/orders/orders        # list orders

docker compose up -d --scale order-service=3 # bonus: run 3 instances of one service
docker compose down -v                       # full reset (wipes the volume)
```

## 📚 Stuck? Read the docs

- [Compose file reference](https://docs.docker.com/reference/compose-file/)
- [`depends_on` + `condition: service_healthy`](https://docs.docker.com/reference/compose-file/services/#depends_on)
- [Networking in Compose (service-name DNS)](https://docs.docker.com/compose/how-tos/networking/)
- [Volumes](https://docs.docker.com/engine/storage/volumes/)
- [Environment variables & `.env` in Compose](https://docs.docker.com/compose/how-tos/environment-variables/)
- [nginx reverse proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)

## 🎁 What you'll get from this project

- **API gateway**: one entrypoint, path-based routing, internal services hidden from the host.
- **Service discovery**: services find each other by Compose service name over the internal network.
- **Service-to-service calls**: order-service orchestrating auth + catalog before it commits.
- **Database-per-service**: loose coupling — each service owns its data.
- **Health-gated startup**: `condition: service_healthy` fixes "app starts before its DB is ready."
- The capstone talking point: *"I containerized and orchestrated a polyglot microservices system behind an API gateway."*

## API reference (all via the gateway at `http://localhost:8080`)

| Method | Path                          | Service  | Description                          |
|--------|-------------------------------|----------|--------------------------------------|
| POST   | `/api/auth/login`             | auth     | Log in, returns a bearer token       |
| GET    | `/api/auth/verify`            | auth     | Validate a token (used by services)  |
| GET    | `/api/catalog/products`       | catalog  | List all products                    |
| GET    | `/api/catalog/products/{id}`  | catalog  | One product by id                    |
| POST   | `/api/orders/orders`          | orders   | Place an order (needs `Bearer` token)|
| GET    | `/api/orders/orders`          | orders   | List orders                          |
