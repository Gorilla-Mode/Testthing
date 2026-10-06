# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS node

FROM eclipse-temurin:25-jdk-noble AS builder
COPY --from=node /usr/local/ /usr/local/
WORKDIR /app

ENV GRADLE_USER_HOME=/root/.gradle
COPY . .
RUN chmod +x gradlew
RUN --mount=type=cache,target=/root/.gradle,sharing=locked \
    --mount=type=cache,target=/root/.npm,sharing=locked \
    ./gradlew --no-daemon clean test bootJar \
    && npm --prefix frontend --ignore-scripts test

FROM eclipse-temurin:25-jre-noble AS runtime
RUN groupadd --system app && useradd --system --gid app --create-home app
WORKDIR /app
COPY --from=builder --chown=app:app /app/build/libs/demo-0.0.1-SNAPSHOT.jar app.jar
USER app
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
