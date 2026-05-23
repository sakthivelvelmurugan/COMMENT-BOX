# CommentBox QA Smoke Test Checklist

Use this checklist to validate the CommentBox API after code changes, container builds, or deployment.

1. Verify the application starts successfully on port `8085` without startup errors.
2. Confirm the health endpoint returns `200 OK` at `http://localhost:8085/actuator/health`.
3. Confirm the default local profile uses H2 by starting without `SPRING_PROFILES_ACTIVE=prod`.
4. Confirm `spring.jpa.hibernate.ddl-auto=validate` by running with `SPRING_PROFILES_ACTIVE=prod` and a valid PostgreSQL connection.
5. Confirm a PostgreSQL database can connect using `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, and `SPRING_DATASOURCE_PASSWORD`.
6. Confirm `logging.level.com.commentbox.api=WARN` is honored in production mode and only warnings or higher are emitted.
7. Confirm `users` table exists and includes `email`, `password_hash`, `role`, `daily_generate_count`, and `last_reset_date`.
8. Confirm `user_api_keys` table exists with `provider`, `encrypted_key`, `is_active`, and `user_id` foreign key constraints.
9. Confirm `comment_history` table exists with `language`, `style`, `density`, `input_code`, `output_code`, `share_uuid`, and `is_shared`.
10. Confirm a new user registration request is accepted and persisted correctly.
11. Confirm login works for an existing user and returns a valid JWT or session behavior.
12. Confirm comment generation/history creation persists a record in `comment_history` for the authenticated user.
13. Confirm `share_uuid` values are unique and `is_shared` toggles correctly when sharing an entry.
14. Confirm a Docker image builds successfully with `docker build -t commentbox-api .` and starts normally.
15. Confirm deployment configuration files are present and valid: `railway.toml`, `vercel.json`, `Dockerfile`, `.dockerignore`, `application-prod.properties`, and `schema.sql`.
