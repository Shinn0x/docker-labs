# 02 · Quotes Service — Dockerfile practice (Java / Spring Boot)

## What this project is

A Spring Boot REST service that serves inspirational quotes. This is the
project where **multi-stage Dockerfiles really pay off**: compiling Java needs
a full JDK + Maven, but *running* it only needs a JRE — so the build toolchain
shouldn't ship in your final image.

The app code is done. **Your job is to write the `Dockerfile` (and
`.dockerignore`)** that builds and runs it as a small, secure image.

## Stack

- Java 21 + Spring Boot 3.3 (Maven)
- Spring Boot Actuator (exposes `/actuator/health`)
- No database

## How it runs (without Docker)

```bash
# Needs JDK 21 + Maven locally:
mvn spring-boot:run
# or
mvn clean package -DskipTests && java -jar target/quotes-service-1.0.0.jar

curl localhost:8080/api/quotes
curl localhost:8080/actuator/health
```

## What the container needs to know

| Concern         | Detail                                                            |
|-----------------|-------------------------------------------------------------------|
| Build           | `mvn clean package -DskipTests` → produces `target/quotes-service-1.0.0.jar` |
| Run             | `java -jar quotes-service-1.0.0.jar`                              |
| Port            | `8080`                                                            |
| Health endpoint | `GET /actuator/health` → `{"status":"UP"}`                       |
| Build deps      | Resolved by Maven from `pom.xml`                                  |

## 🎯 Your Docker task

Write a `Dockerfile` + `.dockerignore`:

- [ ] **Multi-stage build**: a *build* stage on a Maven+JDK image (e.g. `maven:3.9-eclipse-temurin-21`) that compiles the jar, and a *runtime* stage on a JRE-only image (e.g. `eclipse-temurin:21-jre-alpine`)
- [ ] **Cache Maven dependencies** — copy `pom.xml` and run `mvn dependency:go-offline` *before* copying `src/`
- [ ] Copy **only the built jar** into the runtime stage (no source, no Maven)
- [ ] **Run as a non-root user**
- [ ] Add a **`HEALTHCHECK`** that probes `/actuator/health` (the alpine base has busybox `wget`)
- [ ] `EXPOSE 8080` and set `ENTRYPOINT`/`CMD` to launch the jar
- [ ] **Bonus:** use Spring Boot *layered jars* (`java -Djarmode=layertools ... extract`) so dependency layers stay cached when only code changes

### Check yourself

```bash
docker build -t quotes-service .
docker run --rm -p 8080:8080 quotes-service
docker images quotes-service     # goal: ~200 MB, vs ~1 GB for a naive JDK image
```

The image-size win (often **70–80% smaller**) is your headline interview/LinkedIn talking point.

## API reference

| Method | Path                 | Description    |
|--------|----------------------|----------------|
| GET    | `/actuator/health`   | Health probe   |
| GET    | `/api/quotes`        | All quotes     |
| GET    | `/api/quotes/random` | A random quote |
| GET    | `/api/quotes/{id}`   | One by id      |
