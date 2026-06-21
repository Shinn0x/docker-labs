# 🐳 Docker Practice Projects — Dockerfile → Docker Compose → Microservices

Four hands-on projects to practice **writing Dockerfiles and Docker Compose
files yourself**. The application code is provided and working — your job in
each project is to write the Docker artifacts (`Dockerfile`, `.dockerignore`,
`docker-compose.yml`) that build, run, and orchestrate it.

They progress from packaging a single app to orchestrating a multi-language
microservices system.

| # | Project | You write | Stack | Skills practiced |
|---|---------|-----------|-------|------------------|
| [01](./01-dockerfile-node-monolith) | Task Manager API | `Dockerfile`, `.dockerignore` | Node.js + Express | Multi-stage build, layer caching, slim non-root image, HEALTHCHECK |
| [02](./02-dockerfile-java-springboot) | Quotes Service | `Dockerfile`, `.dockerignore` | Java + Spring Boot | Maven multi-stage, JDK→JRE size cut (~75%), layered jars |
| [03](./03-compose-fullstack) | Full-stack Notes | 2× `Dockerfile` + `docker-compose.yml` | React/nginx + Node + Postgres + Redis | Multi-container, service DNS, healthcheck-gated startup, named volumes |
| [04](./04-compose-microservices) | E-commerce Microservices | 4× `Dockerfile` + `docker-compose.yml` | nginx + Node + Java + Postgres + Redis | API gateway, polyglot services, service-to-service calls, DB-per-service |

Each project's README contains: what it is, how it runs, ports, env vars,
service dependencies, and a **🎯 Your Docker task** checklist with a
"check yourself" section to verify your work.

## Suggested order

01 → 04 (difficulty increases). Do the two Dockerfile projects first, then the
two Compose projects.

## Concepts you'll practice across the suite

- **Multi-stage builds** — keep build tooling out of the shipped image (most
  dramatic in the Java project).
- **Small, secure images** — alpine bases, prod-only deps, non-root users.
- **Build cache discipline** — copy dependency manifests before source.
- **`.dockerignore`** — smaller, faster build contexts.
- **Healthchecks** — both `HEALTHCHECK` in Dockerfiles and Compose `healthcheck`.
- **Compose orchestration** — networks, named volumes, env/`.env` config,
  `depends_on` conditions, reverse proxy, and an API gateway.
- **Microservices fundamentals** — independent polyglot services, service
  discovery by name, database-per-service.

> Prerequisites: Docker Engine + Docker Compose v2.

When you've built them, see [LINKEDIN.md](./LINKEDIN.md) for post drafts to
showcase the work.
