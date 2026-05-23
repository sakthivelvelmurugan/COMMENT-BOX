# CommentBox API

CommentBox is a Spring Boot backend API for generating and tracking comment history entries. It is built with Java 17, Spring Boot 3.2.7, H2 for local development, and PostgreSQL for production.

## Project structure

- `src/main/java/com/commentbox/api` — application source code
- `src/main/resources/application.properties` — local default configuration
- `application-prod.properties` — production configuration for PostgreSQL
- `Dockerfile` — multi-stage Maven build to JRE Alpine container
- `.dockerignore` — Docker build exclusions
- `schema.sql` — PostgreSQL production schema DDL
- `railway.toml` — Railway deployment configuration
- `vercel.json` — Vercel Docker deployment configuration
- `SMOKE_TEST.md` — QA checklist for validation

## Prerequisites

- Java 17 JDK
- Maven or the included Maven wrapper (`./mvnw` / `mvnw.cmd`)
- Docker for container builds
- PostgreSQL 14+ for production
- Railway CLI or Vercel CLI for platform-specific deployment

## Local development

The application listens on port `8085` by default.

1. Build the project:

   ```bash
   ./mvnw clean package
   ```

2. Run locally with the default H2 database:

   ```bash
   ./mvnw spring-boot:run
   ```

3. Access the API at:

   ```text
   http://localhost:8085
   ```

By default, local execution uses an in-memory H2 database. You can optionally configure environment variables to point to a PostgreSQL instance in development.

## Production configuration

The production profile is defined in `application-prod.properties` and requires PostgreSQL environment variables.

Required environment variables:

- `SPRING_DATASOURCE_URL` — PostgreSQL JDBC URL, for example `jdbc:postgresql://db:5432/commentbox`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `JWT_SECRET`
- `OPENROUTER_API_KEY`
- `CORS_ALLOWED_ORIGINS` (recommended default: `http://localhost:5500`)
- `SPRING_PROFILES_ACTIVE=prod`

Production settings:

- `spring.jpa.hibernate.ddl-auto=validate`
- PostgreSQL dialect
- logging level set to `WARN`
- actuator health exposed for readiness checks

## Docker

Build the container image:

```bash
docker build -t commentbox-api .
```

Run the container:

```bash
docker run --rm -p 8085:8085 \
  -e SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/commentbox" \
  -e SPRING_DATASOURCE_USERNAME="postgres" \
  -e SPRING_DATASOURCE_PASSWORD="password" \
  -e JWT_SECRET="${JWT_SECRET}" \
  -e OPENROUTER_API_KEY="${OPENROUTER_API_KEY}" \
  -e SPRING_PROFILES_ACTIVE=prod \
  commentbox-api
```

## Database schema

The production schema is managed through `schema.sql`.

Tables:

- `users`
- `user_api_keys`
- `comment_history`

The schema contains referential integrity constraints, default timestamp fields, auto-incrementing primary keys, and an index for history queries.

## Railway deployment

The repository includes `railway.toml` for Railway deployments.

1. Set the required Railway environment variables.
2. Deploy using Railway CLI or Railway dashboard.

## Vercel deployment

The repository includes `vercel.json` configured for Docker-based deployment.

1. Ensure Vercel Docker support is enabled.
2. Deploy the repository using `vercel`.

## Health and readiness

A health endpoint is exposed at:

```text
http://localhost:8085/actuator/health
```

## QA and validation

Use `SMOKE_TEST.md` for a complete 15-step validation checklist after setup.
