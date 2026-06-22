# 02 · Quotes Service — Dockerfile practice (Java / Spring Boot)

## 📖 What this project is about

A Spring Boot REST service that serves inspirational quotes. This is the
project where **multi-stage Dockerfiles really pay off**: compiling Java needs
a full JDK + Maven, but *running* it only needs a JRE — so the build toolchain
should never ship in your final image.

The application code is finished and working. **Your job is to write the
`Dockerfile` (and `.dockerignore`)** that builds and runs it as a small, secure
image.

- **Stack:** Java 21 + Spring Boot 3.3 (Maven)
- **Health:** Spring Boot Actuator exposes `/actuator/health`
- **Data:** none
- **Listens on:** `8080`

## ▶️ How it runs (without Docker)

```bash
# Needs JDK 21 + Maven locally:
mvn spring-boot:run
# or
mvn clean package -DskipTests && java -jar target/quotes-service-1.0.0.jar

curl localhost:8080/api/quotes
curl localhost:8080/actuator/health
```

## 🛠️ Try it yourself

**First, review the code** so you know what the build needs and what the
runtime needs:

| Read this file | What it tells you for the Dockerfile |
|----------------|--------------------------------------|
| `pom.xml` | Java 21, Spring Boot 3.3.4, artifact `quotes-service-1.0.0.jar`, and the `spring-boot-maven-plugin` that produces a **layered jar** |
| `application.properties` | `server.port=8080`, and that only `/actuator/health` is exposed |
| `QuoteController.java` | the routes the running jar serves (no DB, nothing external to wire up) |

**Then write a `Dockerfile` + `.dockerignore`:**

- [ ] **Multi-stage build**: a *build* stage on a Maven+JDK image (e.g. `maven:3.9-eclipse-temurin-21`) that compiles the jar, and a *runtime* stage on a JRE-only image (e.g. `eclipse-temurin:21-jre-alpine`)
- [ ] **Cache Maven dependencies** — copy `pom.xml` and run `mvn dependency:go-offline` *before* copying `src/`
- [ ] Copy **only the built jar** into the runtime stage (no source, no Maven)
- [ ] **Run as a non-root user**
- [ ] Add a **`HEALTHCHECK`** that probes `/actuator/health` (the alpine base has busybox `wget`)
- [ ] `EXPOSE 8080` and set `ENTRYPOINT`/`CMD` to launch the jar
- [ ] **Bonus:** use Spring Boot *layered jars* (`java -Djarmode=layertools ... extract`) so dependency layers stay cached when only code changes

**Check yourself:**

```bash
docker build -t quotes-service .
docker run --rm -p 8080:8080 quotes-service
docker images quotes-service     # goal: ~200 MB, vs ~1 GB for a naive JDK image
```

## 📚 Stuck? Read the docs

- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [Spring Boot — Docker / dockerfiles guide](https://docs.spring.io/spring-boot/reference/packaging/container-images/dockerfiles.html)
- [Spring Boot — efficient container images & layered jars](https://docs.spring.io/spring-boot/reference/packaging/container-images/efficient-images.html)
- [Eclipse Temurin images (build/run bases)](https://hub.docker.com/_/eclipse-temurin)
- [`HEALTHCHECK` instruction](https://docs.docker.com/reference/dockerfile/#healthcheck)

## 🎁 What you'll get from this project

- The single most impressive image-size win in the suite: a **70–80% smaller**
  Java image (~1 GB → ~200 MB) by keeping the compiler out of the runtime stage.
- A clear grasp of **build-time vs run-time dependencies** (JDK+Maven vs JRE).
- **Maven dependency caching** in Docker — copy `pom.xml` and go offline before
  the source.
- **Layered jars**: why a code change shouldn't bust your slow dependency layer.
- Your strongest interview / LinkedIn talking point on container optimization.

## API reference

| Method | Path                 | Description    |
|--------|----------------------|----------------|
| GET    | `/actuator/health`   | Health probe   |
| GET    | `/api/quotes`        | All quotes     |
| GET    | `/api/quotes/random` | A random quote |
| GET    | `/api/quotes/{id}`   | One by id      |
