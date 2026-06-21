# 04 · E-commerce Microservices — Docker Compose practice

## What this project is

A small but realistic **microservices** system you'll orchestrate with Docker
Compose: an nginx **API gateway** in front of three independent services (in
two languages), plus a per-service database and a shared cache.

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

The app code + the gateway's `nginx.conf` are done. **Your job: write a
`Dockerfile` for each service and a `docker-compose.yml` that brings the whole
system up with one command.**

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

## Environment variables

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

`orders-db` reads `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`.
Copy `.env.example` → `.env`. Each Node service has a `src/healthcheck.js`
probe; the Java service has `/actuator/health`.

## 🎯 Your Docker task

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

### Check yourself — full flow

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
docker compose down -v
```

## Talking points (for interviews / LinkedIn)

- **API gateway**: one entrypoint, path-based routing, internal services hidden from the host.
- **Service discovery**: services find each other by Compose service name over the internal network.
- **Database-per-service**: loose coupling — each service owns its data.
- **Health-gated startup**: `condition: service_healthy` fixes "app starts before its DB is ready."
