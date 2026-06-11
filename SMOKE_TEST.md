# CommentBox QA Smoke Test Checklist

Use this checklist to validate the CommentBox API after code changes, container builds, or deployment.

1. Verify the application starts successfully on port `8080` without startup errors.
2. Confirm the health endpoint returns `200 OK` at `http://localhost:8085/actuator/health`.
3. Confirm the application starts successfully in production mode with `SPRING_PROFILES_ACTIVE=prod`.
4. Confirm `logging.level.com.commentbox.api=WARN` is honored in production mode and only warnings or higher are emitted.
5. Confirm a Docker image builds successfully with `docker build -t commentbox-api .` and starts normally.
6. Confirm deployment configuration files are present and valid: `railway.toml`, `vercel.json`, `Dockerfile`, `.dockerignore`, and `application-prod.properties`.
