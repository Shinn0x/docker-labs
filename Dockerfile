# ---- Stage 1: build ----
# JDK 21 + Maven image
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copy deps manifest first and resolve dependencies
COPY pom.xml .
RUN mvn dependency:go-offline

# Copy source and build the executable jar into target/.
COPY src ./src
RUN mvn clean package -DskipTests

# ---- Stage 2: runtime ----
# JRE-only Alpine image
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

# Bring over only the built jar from the build stage.
COPY --from=build /app/target/*.jar app.jar

# Run as a non-root user for security.
USER 1000

EXPOSE 8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/actuator/health || exit 1

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]


# Single-stage version (for reference)
# # JDK 21 + Maven image
# FROM maven:3.9-eclipse-temurin-21 AS build
# WORKDIR /app

# # Copy deps manifest first and resolve dependencies
# COPY pom.xml .
# RUN mvn dependency:go-offline

# # Copy source and build the executable jar into target/.
# COPY src ./src

# # Run as a non-root user for security.
# USER 1000

# EXPOSE 8080

# # Healthcheck
# HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
#   CMD wget --quiet --tries=1 --spider http://localhost:8080/actuator/health || exit 1

# # Run the application
# ENTRYPOINT ["java", "-jar", "app.jar"]
